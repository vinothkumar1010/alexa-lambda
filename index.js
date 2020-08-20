const Alexa = require('ask-sdk-core');
const launchIntentDocument = require('./launchIntent.json');
const yelp = require('yelp-fusion');

const {getUserDetails,getBabyDetails,updatePregnancyDetails,babyAndPregnancyDetails}=require("./db")
const {updatePregnancyHandler,updatePositivePregnancyHandler,updateFailurePregnancyHandler}=require("./updatePregnancy")
const {ErrorHandler,LogRequestInterceptor,LogResponseInterceptor}=require("./utilityHandlers")
const {HelpIntentHandler,CancelAndStopIntentHandler,SessionEndedRequestHandler}=require("./amazonIntents")
// from https://www.yelp.com/developers/v3/manage_app
const apiKey = '-GgFviVcHtiYCMq6wC4sopjwvCi_k35DjiwdkfpeT-BMJUzNRveUAqgx2xpONfa7tS0evvg1vh-oKIcJ4ziQrtVUWNJjIFTjQAwICc8anC9o89g5-xUVepxCoSIeX3Yx';

/*******
 * Application constants
 */
const daysForCalculation=280//since 40 weeks
const ONE_DAY = 1000 * 60 * 60 * 24;


const sendEventHandler = {
  canHandle(handlerInput) { 
    const request = handlerInput.requestEnvelope.request;
 
    // listening for an APL.UserEvent
    return request.type === 'Alexa.Presentation.APL.UserEvent' && request.arguments.length > 0;
  },
  handle(handlerInput) {
 
    // logging the incoming UserEvent
    console.log("APL UserEvent to the skill: " + JSON.stringify(handlerInput.requestEnvelope.request))
    
    // retrieving the SendEvent argument(s)
    let argumentFromSkill = handlerInput.requestEnvelope.request.arguments[0]
 
    // argumentFromSkill will be equals to "button_pressed"
    if(argumentFromSkill==="balanceRequested")
    {
      return BalanceIntentHandler.handle(handlerInput);
    }
    else if(argumentFromSkill==="paybillRequested")
    {
      return PaybillIntentHandler.handle(handlerInput);
    }
    else if(argumentFromSkill==="usageRequested")
    {
      return WeeklyUsageIntentHandler.handle(handlerInput);
    }
    else
    {
      return responseBuilder
      .speak("event handler reached this point")
      .getResponse();
    } 
  }
    
}
const welcomeIntentHandler={
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'CanFulfillIntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'welcome';
  },
  handle(handlerInput) {
    return LaunchRequestHandler.handle(handlerInput,true);  
  }
 
}
const LaunchRequestHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput,fromFullFillment=false) {
      console.log("I am inside of this")
      let alexa_user_id=handlerInput.requestEnvelope.session.user.userId;
      let utilUserId= Alexa.getUserId(handlerInput.requestEnvelope);
      console.log(utilUserId)
      return getUserDetails(alexa_user_id).then((userResponse)=>{
        if(userResponse)
        {
          return welcomeResponseBuilder(handlerInput,userResponse.dataExists,userResponse.userData)
          
        }
        else 
          return ErrorHandler.handle(handlerInput,{message:"User response not responding with value true"});
      }).catch(error=>{
        return ErrorHandler.handle(handlerInput,{message:error});
      });
    }
  };
  function welcomeResponseBuilder(handlerInput,dataExists,userData={})
  {
    
    let  speakOutput = '';
    
    if(!dataExists || !("pregnant" in userData))
    {
      console.log("Data not exist")
      speakOutput=`Hi, <p>welcome ${dataExists?"back":""} to mamma world.</p> `;
      if(!("pregnant" in userData) && dataExists)
      {
        speakOutput+="<p>Last time we didn't get your pregnancy information.</p> <p>Are you currently pregnant ?</p>"
      }
      else
      {
        speakOutput+="Are you currently pregnant?";
      }
      return welcomeSpeechMessage(handlerInput,speakOutput);
    }
    else
    {
      speakOutput="Hi, <p>welcome back to mamma world.</p> "
      let userGivenDate="";
      console.log(userData.pregnancyDetails)
      if(("pregnancyDetails" in userData))
      {
        if(userData.pregnancyDetails.pregancyWentWell)
        {
          speakOutput+="<p>Our data indicates that you gave birth to a child</p>. <p>If you would like start another pregnancy journey please say</p><p>I am going to have another baby</p>";
          return welcomeSpeechMessage(handlerInput,speakOutput);
        }
        else
        {
          speakOutput+="<p>Our data indicates that your last prgnancy didn't go well</p>. <p>If you would like start another pregnancy journey please say</p><p>I am going to have another baby</p>";
          return welcomeSpeechMessage(handlerInput,speakOutput);
        }
      }
      else
      {
     return getBabyDetails(userData.alexaUserID).then(response=>{
            console.log(response);
            userGivenDate=response.babyData.usergivenDate;
            if(response.babyDataExists)
              return welcomeSpeechMessage(handlerInput,speakOutput,true,userGivenDate);
            else
            {
              speakOutput+="<p>Let's calculate your pregnancy week</p><p>For that , please say like,</p>       <p>date for calculation is, August 3 2020</p>,  <p>else , please say  No </p>"
              return welcomeSpeechMessage(handlerInput,speakOutput);
            }
            
      }).
      catch(error=>{
        return ErrorHandler.handle(handlerInput,{message:error});
      })
    }
    }
  }
  function welcomeSpeechMessage(handlerInput,speechMessage,addBabyGrowth=false,usergivenDate="")
  {
    let speakOutput=speechMessage
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.servedIntent = "welcomeIntent";
    
    let responseBuilder = handlerInput.responseBuilder;
      if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']){
          responseBuilder.addDirective({
              type: 'Alexa.Presentation.APL.RenderDocument',
              token: "sample",
              document: launchIntentDocument.document,
              datasources:launchIntentDocument.datasources
          });
          speakOutput += " "
      } 
      if(!addBabyGrowth)
      {
        sessionAttributes.askedQuestion = "pregnantOrNot";
      return responseBuilder
          .speak(speakOutput)
          .reprompt("Are you currently pregnant?")
          .getResponse();
      }
      else
      {
        console.log(`${usergivenDate}  >>>>>> usergivenDate`)
        sessionAttributes.askedQuestion = "";
        calculateWeeK(usergivenDate).then((getPregnancyWeek)=>{
          if(!getPregnancyWeek.properDate)
          {
            speakOutput+="<p>We cant calculate the weeks based on the date you provided</p><p>Please provde your first date of Last mensural period by saying </p><p> calculate from June 3rd 2019</p> ";
          }
          else if(getPregnancyWeek.completedWeeks<5)
          {

            speakOutput+="<p>It is too early too say about pregnancy. Please consult your doctor.</p><p> If you would like to find a doctor please say</p><p> find doctor for my pregnancy </p> ";
          }
          else if (getPregnancyWeek.completedWeeks>=40)
          {
            speakOutput+="<p>You are more than 40 weeks of your pregnancy</p> <p> If you already gave brith ask </p><p> update my pregnancy </p> ";
          }
          else
          {
            speakOutput+=babySizeBasedonWeek(getPregnancyWeek.completedWeeks);
          }
          return responseBuilder
          .speak(speakOutput)
          .reprompt("<p>Do you know,  you can ask facts for this week pregnancy by asking </p><p>what are the facts for this week</p>")
          .getResponse();
        }).catch(error=>{
          return ErrorHandler.handle(handlerInput,{message:"something went wrong while getting baby's growth"});
        })
        
      }
      
      return responseBuilder
      .speak(speakOutput)
      .reprompt("Are you currently pregnant?")
      .getResponse();
  }
  const YesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent';
    },
    handle(handlerInput) {
      let speakOutput=""
      let alexa_user_id=handlerInput.requestEnvelope.session.user.userId;
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      let promptForUser=''
      if (sessionAttributes.servedIntent==="welcomeIntent") {
        promptForUser='<p>if you know your due date or first day of your last menstrual period </p>, please say like, <p>date for calculation is, August 3 2020</p>,  <p>else , please say  No </p>'
        updatePregnancyDetails(alexa_user_id);
        speakOutput+=` <amazon:emotion name="excited" intensity="high">Congratulations!</amazon:emotion>${promptForUser}`
      } 
      else if (sessionAttributes.servedIntent==="NoIntent" && sessionAttributes.askedQuestion==="ovulationCalc") {
        return ovulCalcHandler.handle(handlerInput);
      }  
       else
       {
        promptForUser='<p>we are currently working on this request</p>'
        speakOutput+="we are currently working on this request"
       } 
       sessionAttributes.servedIntent="YesIntent";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(promptForUser)
            .getResponse();
    }
};

const NoIntentHandler = {
  canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent';
  },
  handle(handlerInput) {
    let speakOutput=""
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    if (sessionAttributes.servedIntent==="welcomeIntent") {
      speakOutput+='No problem. Are you currently looking for an ovulation calculator ?'
      sessionAttributes.askedQuestion="ovulationCalc"
    } 
    else if (sessionAttributes.servedIntent==="NoIntent") {
      speakOutput+='<p>No problem</p> <p>You can do lot of other things with this skill</p> <p>You can say explore skill </p> to get to know what else you can do'
      sessionAttributes.askedQuestion="ovulationCalc"
    } 
     else
     {
      speakOutput+="We didn't ask you question which expects answer as No"
     }
     sessionAttributes.userCameFrom=sessionAttributes.servedIntent;
     sessionAttributes.servedIntent = "NoIntent";
      return handlerInput.responseBuilder
          .speak(speakOutput)
          //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
          .getResponse();
  }
};
const ovulCalcHandler = {
  canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ovulation_calc';
  },
  handle(handlerInput) {
    let speakOutput=""
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
   
     speakOutput+="<p>We need your first day of last period for calculation</p><p> can you provide date by saying </p><p>Calculate from August 3,2020</p>"
     
     sessionAttributes.servedIntent = "ovulCalc";
     sessionAttributes.askedQuestion = "";
      return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(speakOutput)
          .getResponse();
  }
};
const LMPHandler = {
  canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LMP';
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let LMPGivenDate = handlerInput.requestEnvelope.request.intent.slots.Provided_LMP.value;
    sessionAttributes.LMPGivenDate = LMPGivenDate;
    let speakOutput=`<p>we need your average period cycle</p><p>Please say like </p><p>period cycle is 28 days</p>`
     sessionAttributes.servedIntent = "LMP";
     sessionAttributes.askedQuestion = "";
      return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt('You can ask what else I can do with this skill ?')
          .getResponse();
    
  }
};
const calculateovulationDate={
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        && Alexa.getIntentName(handlerInput.requestEnvelope) === 'cycle_duration';
},
handle(handlerInput) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  let LMPDate= new Date(sessionAttributes.LMPGivenDate)
  let averageCycle = handlerInput.requestEnvelope.request.intent.slots.average_cycle.value;  
   if(sessionAttributes.LMPGivenDate==="")
   {
    return handlerInput.responseBuilder
    .speak("<p>we dont find your first day of last menusal period</p><p> can you provide date by saying </p><p>Calculate from August 3,2020</p> and <p>average cycle is 28 days</p>")
    .getResponse();
   }
  else if(parseInt(averageCycle)>40 || parseInt(averageCycle)<20)
  {
  
    return handlerInput.responseBuilder
    .speak("we can't calculate with the given average cycle period. Pleae provide average period cycle range between twenty to forty.")
    .getResponse();
  }
  else 
  {
    let substractFourteen=parseInt(averageCycle)-14;
    let dateForFertility=new Date(LMPDate.getTime() + (substractFourteen * ONE_DAY));
    var month = dateForFertility.getUTCMonth() + 1; //months from 1-12
    var day = dateForFertility.getUTCDate();
    var year = dateForFertility.getUTCFullYear();
    let formattedFertilityDate = year + "/" + month + "/" + day;
    let speakOutput=""
     speakOutput+=`<p>from <say-as interpret-as="date">${formattedFertilityDate}</say-as> to next two days there is high chance of pregnancy</p><p>You can ask what else I can do with this skill ?</p>`
   
   sessionAttributes.servedIntent = "LMP";
   sessionAttributes.askedQuestion = "";
    return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt('You can ask what else I can do with this skill ?')
        .getResponse();
  }
}
}
const pregnancyWeekHandler={
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'pregnancy_week';
  },
  handle(handlerInput) {
    
    let userGivenDate = handlerInput.requestEnvelope.request.intent.slots.pregnancyWeek.value;   
    let weeknumber=0;
    let speakOutput=""
    let LMP=false;  //Find whether user gave last mensural period fist date
   return  calculateWeeK(userGivenDate).then(calculatedWeeKNumber=>{
     
      if(!calculatedWeeKNumber.properDate)
      {
        speakOutput+="<p>We cant calculate weeks based on the date you provided</p><p>Please provde your first date of Last mensural period by saying </p><p> calculate from June 3rd 2019</p> ";
      }
      else if(calculatedWeeKNumber.completedWeeks<5)
      {

        speakOutput+="<p>It is too early too say about pregnancy. Please consult your doctor.</p><p> If you would like to find a doctor please say</p><p> find doctor for my pregnancy </p> ";
      }
      else if (calculatedWeeKNumber.completedWeeks>=40)
      {
        speakOutput+="<p>You are more than 40 weeks of your pregnancy</p> <p> If you already gave brith ask </p><p> update my pregnancy </p> ";
      }
      else
      {
        weeknumber=calculatedWeeKNumber.completedWeeks;
        LMP=calculatedWeeKNumber.LMP;
        console.log(weeknumber)
        speakOutput+=`<amazon:emotion name="excited" intensity="medium">Wow !</amazon:emotion> ${babySizeBasedonWeek(weeknumber)}<p>If you would like to find a doctor please say find <say-as interpret-as="spell-out">OBGYN</say-as> </p>, else say <p>give name to my baby</p>`;
      }
      return true;
    }).
    then(()=>{
      console.log(`${weeknumber} <<<<<<<<<< ${userGivenDate} ********* ${LMP}`)
      return updateBabyAndPregnancyDetails(handlerInput,speakOutput,weeknumber,userGivenDate,LMP)
    }).
    catch(error=>{
      console.log(error);
      return ErrorHandler.handle(handlerInput,{message:error});
    })
   
      
  }
 
}
async function updateBabyAndPregnancyDetails(handlerInput,speakOutput,weeknumber,userGivenDate,LMP)
{
  let alexa_user_id=handlerInput.requestEnvelope.session.user.userId;
    return babyAndPregnancyDetails(alexa_user_id,weeknumber,userGivenDate,LMP).then(response=>{
    if(response)
    {
      return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
    }
    else 
    {
    return ErrorHandler.handle(handlerInput,{message:"babyAndPregnancyDetails method doesn't respond with true"});
    }
  }).catch(error=>{
    return ErrorHandler.handle(handlerInput,{message:error});
  }) 
}
async function calculateWeeK(date)
{
  return new Promise((resolve, reject)=>{
    let givenDate= new Date(date)
    let firstMensuralDate=0;
    let LMPGiven=false;
    let dueDate=0;
      if( givenDate > new Date())
      { 
       // firstMensuralDate=new Date(givenDate.getTime() - (daysForCalculation * ONE_DAY));
        let weekAndLMP={
          "properDate":false,
          "reason":"Future Date"
        }
        resolve(weekAndLMP);
      }
      else 
      {
        firstMensuralDate=givenDate;
        LMPGiven=true;
        dueDate=new Date(givenDate.getTime() + (daysForCalculation * ONE_DAY));
        const differenceMs = Math.abs(new Date()-firstMensuralDate);
        let completedWeeks=Math.round(Math.round(differenceMs / ONE_DAY)/7)
        let weekAndLMP={
          "LMP":LMPGiven,
          "completedWeeks":completedWeeks,
          "properDate":true,
        }
        resolve(weekAndLMP);
      }
     
       
  })
 
  
}
function babySizeBasedonWeek(weekNumber)
{ 
  const babyChart=require("./chart/babyChart.json")  
    let valuetoReturn= ((weekNumber in babyChart.chart)?`<p>Now your baby is ${weekNumber} weeks old</p> <p>and in size of ${babyChart.chart[weekNumber]}.</p>`:"")
    console.log(valuetoReturn);
    return valuetoReturn;
  
 
}
  const doctorfinderHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'doctorfinder';
    },
    handle(handlerInput) {
      const searchRequest = {
        term:'Obstetricians & Gynecologists',
        location: '77057'
      };
      const client = yelp.client(apiKey);
     let output= client.search(searchRequest).then(response => {
        const firstResult = response.jsonBody.businesses;
        const prettyJson = JSON.stringify(firstResult, null, 4);
        console.log(prettyJson);
        let  speakOutput = 'These are the doctors from the intenet.';
  
      let responseBuilder = handlerInput.responseBuilder;
      if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']){
          
          // Add the RenderDocument directive to the responseBuilder
          responseBuilder.addDirective({
              type: 'Alexa.Presentation.APL.RenderDocument',
              token: "sample",
              document: launchIntentDocument.document,
              datasources:launchIntentDocument.datasources
          });
          
          // Tailor the speech for a device with a screen.
          speakOutput += " You can see doctor details on the screen"
      } else {
          // User's device does not support APL, so tailor the speech to this situation
          speakOutput += " Can I speak";
      }
      return responseBuilder
          .speak(speakOutput)
          .getResponse();
       
      }
      ).catch(error => {
        console.log(error);
        return ErrorHandler.handle(handlerInput,"Something went wrong while finding doctor.");
      });
    
      return output;
    }
  };
  const appointmentReminderHandler={
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'appointment_reminder';
    },
   async handle(handlerInput) {
      
      const apiClient = handlerInput.serviceClientFactory.getReminderManagementServiceClient(),
      { permissions } = handlerInput.requestEnvelope.context.System.user
      
    /*
      Check if user has granted the skill permissions.
      If not, send consent card to request reminders read and write permission for skill
    */
    if(!permissions) {
      return handlerInput.responseBuilder
        .speak("Please enable reminders permissions in the Amazon Alexa app")
        .withAskForPermissionsConsentCard(["alexa::alerts:reminders:skill:readwrite"])
        .getResponse()
    }
      let appointmentDate = handlerInput.requestEnvelope.request.intent.slots.appointment_date.value;   
      let appointment_time=handlerInput.requestEnvelope.request.intent.slots.appointment_date.value;   
      let DoctorName=handlerInput.requestEnvelope.request.intent.slots.doctor_name.value;   
     
      /* const reminderTime = `${appointmentDate}T${appointment_time}:00`, // Use Moment Timezone to get the current time in Pacific Time
      reminderRequest = {
        requestTime: handlerInput.requestEnvelope.request.timestamp, // Add requestTime
        trigger: {
          type: "SCHEDULED_ABSOLUTE", // Update from SCHEDULED_RELATIVE
          scheduledTime: reminderTime,
          recurrence: {                     
            freq : "DAILY" // Set recurrence and frequency
          }
        },
        alertInfo: {
          spokenInfo: {
            content: [{
              locale: "en-US",
              text: "Time to get yo daily banana. You better go before the banistas pack up.",
            }]
          }
        },
        pushNotification: {
          status: "ENABLED"
        }
      } */
      const reminderRequest = {
        trigger: {
          type: "SCHEDULED_RELATIVE",
          offsetInSeconds: "20",
        },
        alertInfo: {
          spokenInfo: {
            content: [{
              locale: "en-US",
              text: "Testing in twenty seconds",
            }],
          },
        },
        pushNotification: {
          status: "ENABLED"
        }
      }
      try {
        await apiClient.createReminder(reminderRequest);
        return handlerInput.responseBuilder
          .speak("A reminder to test 20 seconds has been successfully created.")
          .getResponse();
    } catch(error) {
        console.log(`~~~~~ createReminder Error ${error} ~~~~~`)
        return handlerInput.responseBuilder
            .speak("There was an error creating your reminder. Please let the skill publisher know.")
            .getResponse();
    }
    }
   
  }

  let skill;

exports.handler = async function (event, context) {
  console.log(`REQUEST++++${JSON.stringify(event.body)}`);
  
  //let payload = JSON.parse(event.body); //comment this line for deployment
  let payload=event //uncomment this line for deployment

  if (!skill) {
    //console.log(payload)
    skill = Alexa.SkillBuilders.custom()
      .addRequestHandlers(
        welcomeIntentHandler,
        LaunchRequestHandler,
        YesIntentHandler,
        NoIntentHandler,
        pregnancyWeekHandler,
        doctorfinderHandler,
        ovulCalcHandler,
        calculateovulationDate,
        LMPHandler,
        appointmentReminderHandler,
        sendEventHandler,
        updatePregnancyHandler,
        updatePositivePregnancyHandler,
        updateFailurePregnancyHandler,
        HelpIntentHandler,  
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
      )
      .addRequestInterceptors(LogRequestInterceptor)
      .addResponseInterceptors(LogResponseInterceptor)
      .addErrorHandlers(ErrorHandler)
      .withApiClient(new Alexa.DefaultApiClient())
      .create();
  }

  const response = await skill.invoke(payload, context);

  console.log(`RESPONSE++++${JSON.stringify(response)}`);

  return response; //uncomment this line for deployment and comment the below return for deployment
 /*  return {
    'statusCode': 200,
    'body': JSON.stringify({
        message: response
    })
  } */
};
