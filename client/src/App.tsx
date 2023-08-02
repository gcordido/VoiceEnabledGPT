import { useState, useEffect } from 'react';
import ScrollToBottom from 'react-scroll-to-bottom';
import { ResultReason } from "microsoft-cognitiveservices-speech-sdk";
import './App.css';
import axios from 'axios';
import { getTokenOrRefresh } from './token_util';

function App() {
  
  const speechsdk = require("microsoft-cognitiveservices-speech-sdk");

  const [userPrompt, setPrompt] = useState("");

  const [messageList, setMessage] = useState<{ role: string, content: string }[]>([
    { role: 'system', content: 'You are an AI chatbot that answers questions in at most two sentences.'}
  ]);
  const [isMicInput, setIsMicInput] = useState(false);
  const [comesFromMic, setComesFromMic] = useState(false);

  const maxMessages = 10;

  useEffect(() => {
      callAPI();
      if(comesFromMic && messageList[messageList.length - 1].role === 'assistant'){
        speechToText();
      }
  }, [messageList]);

  useEffect(() => {
    if(isMicInput){
      updateMessages();
      setIsMicInput(false);
    }

  }, [isMicInput]);

  async function callAPI() {
    const lastMessage = messageList[messageList.length - 1];
    if (lastMessage.role === 'user') {
      try {

        let answer: string = "";
        let completion: any = {};

        const options = {
          url: 'http://localhost:8000/openai-api-call',
          method: 'POST',
          data: messageList
        }
        
        await axios(options).then((response) => {
          completion = response;
        }).catch((error) => {
          console.error(error)
        })
        
        if (completion != undefined){
          answer = (completion.data.choices[0]?.message?.content) as string;
  
          if (messageList.length > maxMessages) {
            messageList.splice(1, 1);
          }
          setMessage(messageList => [...messageList, { role: 'assistant', content: answer }]);
        }

      } catch (e) {
        // Handle any errors that occur during the chatbot request.
        console.error('Error getting data', e);
        throw e;
      }
    }
  };

  const updateMessages = () => {
    if(userPrompt !== ""){

      if(messageList.length > maxMessages){
        messageList.splice(1,1);
      }
      let newMessageList = [...messageList, { role: 'user', content: userPrompt }];
      setMessage(newMessageList);
      setPrompt('');
    }
  };

 async function getFromMic() {
    
    const tokenObj = await getTokenOrRefresh();

    const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
    speechConfig.speechRecognitionLanguage = 'en-US';

    // Create an AudioConfig object that uses the default microphone input.
    const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();


    const speechRecognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

    let emoji = document.getElementById("mic");
    if(emoji){
      emoji.innerHTML = "&#128308;"
    }

    // Start recognizing speech from the microphone input.
    speechRecognizer.recognizeOnceAsync((result: any): void => {

      // If speech was recognized, set the user's prompt to the recognized text and get a response from the OpenAI chatbot.
      if (result.reason === ResultReason.RecognizedSpeech) {

        const audioPrompt = result.text;
        setPrompt(audioPrompt);
        setIsMicInput(true);
        setComesFromMic(true);
      };
      if(emoji) emoji.innerHTML = '&#127908';
    });
  }


  
  async function speechToText() {
    const tokenObj = await getTokenOrRefresh();

    // Create a SpeechConfig object with the user's subscription key and region.
    const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
    
    speechConfig.speechSynthesisLanguage = "en-US"; 
    speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";

    // Create an AudioConfig object that uses the default microphone input.
    const audioConfig = speechsdk.AudioConfig.fromDefaultSpeakerOutput();

    const speechSynthesizer = new speechsdk.SpeechSynthesizer(speechConfig, audioConfig);

    const lastMessage = messageList[messageList.length - 1];

    speechSynthesizer.speakTextAsync(lastMessage.content)
    setComesFromMic(false);
    
  }
  
  return (
    <div className="App">
      <div className="chat-window">
      <div className="chat-header">
        <p>Chat with a Robot</p>
      </div>
      <div className="chat-body">
      <ScrollToBottom className="message-container">
        {messageList.map((message) => {
          if (message.role === "system") {
            return null; // ignore this element
          }
          return (
            <div className="message"
              id={message.role === "user" ? "other" : "you"}
            >
              <div>
                <div className="message-content">
                  <p>{message.content}</p>
                </div>
                <div className="message-meta">
                  <p id="author">{message.role}</p>
                </div>
              </div>
            </div>
          );
        })}
        </ScrollToBottom>
      </div>
      <div className="chat-footer">
        <input 
        type="text"
        value={userPrompt} 
        placeholder="Type your prompt here..." 
        onChange={(event) => {
          setPrompt(event.target.value)
        }}
        onKeyDown={(event) => {
          event.key === "Enter" && updateMessages();
        }}
        />
        <button onClick={() => {
          updateMessages();
        }}>&#9658;</button>
        <button id="mic" onClick={() => {
          getFromMic();
        }}>&#127908;</button>
      </div>
      </div>
    </div>
  );
};

export default App;
