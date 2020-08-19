const Alexa = require('ask-sdk-core');
const {getUserDetails,updateBabyBirthDetails}=require("./db")
const {ErrorHandler}=require("./utilityHandlers")
const updatePregnancyHandler={
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'update_pregnancy';
    },
    handle(handlerInput) {
        let alexa_user_id=handlerInput.requestEnvelope.session.user.userId;
        return getUserDetails(alexa_user_id).then((userResponse)=>{
           let speakOutput="";
            if(userResponse)
            {
                speakOutput="<p>If you would like to update your pregnancy details, please say any one of it </p> <p>I gave a birth</p><p>It didn't go well</p>"
            }
            else
            {
                speakOutput="<p>Sorry we dont find your records in our system</p><p>you can start from begining</p>"
            }
               return handlerInput.responseBuilder
              .speak(speakOutput)
              .reprompt(speakOutput)
              .getResponse();
          }).catch(error=>{
            return ErrorHandler.handle(handlerInput,{message:error});
          });
        }
     
        
    }
    const updatePositivePregnancyHandler={
      canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'pregnancy_status_positive';
      },
      handle(handlerInput) {
          let alexa_user_id=handlerInput.requestEnvelope.session.user.userId;
          return updateBabyBirthDetails({"userID":alexa_user_id,"pregnancyWentWell":true}).then((userResponse)=>{
             let speakOutput="";
              if(userResponse)
              {
                  speakOutput="<p>Wow! It's time to enjoy your parenthood</p><p>Hope we helped during your pregnancy journey</p><p>You can come and use it for next baby too</p>"
              }
              else
              {
                  speakOutput="<p>Sorry we dont find your records in our system</p><p>Please try again later</p>"
              }
                 return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
            }).catch(error=>{
              return ErrorHandler.handle(handlerInput,{message:error});
            });
          }
       
          
      }
      const updateFailurePregnancyHandler={
        canHandle(handlerInput) {
          return handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'pregnancy_status_failure';
        },
        handle(handlerInput) {
            let alexa_user_id=handlerInput.requestEnvelope.session.user.userId;
            return updateBabyBirthDetails({"userID":alexa_user_id,"pregnancyWentWell":false}).then((userResponse)=>{
               let speakOutput="";
                if(userResponse)
                {
                    speakOutput="<p>Sorry to hear your loss</p><p>Hope we helped during your pregnancy journey</p>"
                }
                else
                {
                    speakOutput="<p>Sorry we dont find your records in our system</p><p>Please try again later</p>"
                }
                   return handlerInput.responseBuilder
                  .speak(speakOutput)
                  .reprompt(speakOutput)
                  .getResponse();
              }).catch(error=>{
                return ErrorHandler.handle(handlerInput,{message:error});
              });
            }
         
            
        }
    module.exports={
        updatePregnancyHandler,
        updatePositivePregnancyHandler,
        updateFailurePregnancyHandler
    }