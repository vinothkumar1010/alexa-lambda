
const admin = require('firebase-admin');
//admin.initializeApp();
var serviceAccount = require("./serviceAccountKey.json");

 admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mamma-c6fad.firebaseio.com"
}); 


const db = admin.firestore();
const getUserDetails=async (alexa_user_id)=>{
    const document = db.collection('users').doc(alexa_user_id);
    return document.get().then((doc)=>{
        
        let dataExists=false;
        let userData={};
        if (doc && doc.exists) {
          dataExists=true;
          userData=doc.data();
          console.log("User is existing user")
          document.update({ 
            lastLoginDate:new Date().toISOString()
          });
        } else {
          console.log("we are going to insert new document")
          document.set({
              alexaUserID:alexa_user_id,
              createdAt: new Date().toISOString(),
              lastLoginDate:new Date().toISOString()
            });
        }
          return {dataExists:dataExists,userData:userData};
      }).catch(error=>{
        console.log(error);
        return false;
      })
    
}
const getBabyDetails=async (alexa_user_id)=>{
    const document = db.collection('users').doc(alexa_user_id).collection('baby').orderBy('createdAt', 'desc').limit(1);
    return document.get().then((doc)=>{
        console.log(`baby details exisits or not >>>> ${ doc.empty} >>>>>> ${ doc.size}`)
        let babyDataExists=false;
      let babyData={};
        if (!doc.empty && doc.size>0) {
            babyDataExists=true;
            console.log(doc.docs[0].id)
            babyData=doc.docs[0].data();
            /* doc.forEach(babyInfo => {
              babyData=babyInfo.data();
            }); */
        } 
          return {babyDataExists:babyDataExists,babyData:babyData};
      }).catch(error=>{
        console.log(error);
        return false;
      })
    
}
const updatePregnancyDetails=async (alexa_user_id)=>{
    db.collection('users').doc(alexa_user_id).set({
        pregnant:true
      },{merge:true})
      return true;
}
const babyAndPregnancyDetails=async (alexa_user_id,weeknumber=0,userGivenDate="",LMP=false,anotherBaby=false)=>{
   // const document = db.collection('users').doc(alexa_user_id).collection('baby').doc(alexa_user_id);
   let basicQuery=db.collection('users').doc(alexa_user_id).collection('baby');
   let document = basicQuery.orderBy('createdAt', 'desc').limit(1);
    console.log(`${weeknumber} >>>>>> ${userGivenDate} >>>>>>>> ${LMP}`)
      /* return document.get().then((doc)=>{       
        if (doc && doc.exists) {
          document.update({ 
            pregnancy_week:weeknumber,
          });
        } else {
          document.set({
              pregnancy_week:weeknumber,
              usergivenDate:userGivenDate,
              LMPGiven:LMP,
              createdAt: new Date().toISOString()
            });
        }
        return true;
      }).catch(error=>{
        console.log(error);
        return false;
      }) */
      return document.get().then((doc)=>{       
        if (!doc.empty && doc.size>0) {

          console.log("we are gonna update pregnancy")
          if(anotherBaby)
          {
            basicQuery.doc(`pregnancy_${(doc.size+1)}`).set({
              pregnancy_week:weeknumber,
              usergivenDate:userGivenDate,
              LMPGiven:LMP,
              createdAt: new Date().toISOString()
            });
          }
          else
          {
            basicQuery.doc(doc.docs[0].id).update({ 
              pregnancy_week:weeknumber,
            });
          }
        } else {
          basicQuery.doc("pregnancy_1").set({
            pregnancy_week:weeknumber,
            usergivenDate:userGivenDate,
            LMPGiven:LMP,
            createdAt: new Date().toISOString()
          });
        }
        return true;
      }).catch(error=>{
        console.log(error);
        return false;
      }) 
      
}
const updateBabyBirthDetails=async (userAndPregInfo)=>{
  let pregnancyDetails;
  if(userAndPregInfo.pregnancyWentWell)
  {
    pregnancyDetails={
      gaveBirth:true,
        pregancyWentWell:true
    }
}
else
{
  pregnancyDetails={
    gaveBirth:false,
      pregancyWentWell:false
  }
}
  db.collection('users').doc(userAndPregInfo.userID).set({
    pregnancyDetails
    },{merge:true})
    return true;
}
module.exports={
    getUserDetails,
    getBabyDetails,
    updatePregnancyDetails,
    babyAndPregnancyDetails,
    updateBabyBirthDetails
}