const ErrorHandler = {
    canHandle() {
      return true;
    },
    handle(handlerInput, error) {
      console.log(`Error handled: ${error.message}`);
  
      return handlerInput.responseBuilder
        .speak('Sorry, I can\'t understand the command. Please say again.')
        .reprompt('Sorry, I can\'t understand the command. Please say again.')
        .getResponse();
    },
  };
 
/**
 * Request Interceptor to log the request sent by Alexa
 */
const LogRequestInterceptor = {
    process(handlerInput) {
      // Log Request
      console.log("==== REQUEST ======");
     console.log(handlerInput.requestEnvelope)
     console.log("==== Formatted request ======");
     console.log(JSON.stringify(handlerInput.requestEnvelope, null, 2));
    }
  }
  /**
   * Response Interceptor to log the response made to Alexa
   */
  const LogResponseInterceptor = {
    process(handlerInput, response) {
      // Log Response
      console.log("==== RESPONSE ======");
      //**** below console log printing undefined */
      console.log(JSON.stringify(response, null, 2));
    }
  }

  module.exports={
    ErrorHandler,
    LogRequestInterceptor,
    LogResponseInterceptor
}