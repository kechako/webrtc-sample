import {
  setStreamAndPlay,
  initPreviewVideo,
} from "./video.js";
import {
  WebRTCMode,
  WebRTCController,
} from './webrtc.js'

window.addEventListener("load", async (e: Event) => {
  // buttons
  const connectOfferButton = document.getElementById("connect-offer") as HTMLButtonElement;
  const connectAnswerButton = document.getElementById("connect-answer") as HTMLButtonElement;
  const readSDPButton = document.getElementById("read-sdp") as HTMLButtonElement;

  // Video
  const videoBox = document.getElementById("video-box") as HTMLElement;
  const videoPreview = document.getElementById("preview") as HTMLVideoElement;

  // SDP
  const sdpSend = document.getElementById("sdp-send") as HTMLTextAreaElement;
  const sdpRead = document.getElementById("sdp-read") as HTMLTextAreaElement;

  // logs
  const logs = document.getElementById("logs") as HTMLUListElement;

  // copy SDP
  const copyButton = document.getElementById("copy") as HTMLButtonElement;
  copyButton.addEventListener("click", (e: Event) => {
    sdpSend.select();
    document.execCommand("copy");
  });

  // clear all
  sdpSend.value = "";
  sdpRead.value = "";
  logs.innerHTML = "";

  // logger
  const logger = {
    info: (msg: string) => {
      const li = document.createElement("li");
      li.innerText = msg;
      logs.appendChild(li);
    },
    error: (err: any) => {
      logger.info("error: " + err.toString());
      console.error(err);
    },
  };

  try {
    var stream = await initPreviewVideo(videoPreview, {
      video: true,
      audio: true,
    });

  } catch (err) {
    logger.error(err);
    return;
  }

  var controller: WebRTCController;

  function initController(mode: WebRTCMode) {
    controller = new WebRTCController(logger, mode);

    controller.setTrackHandler(async (stream: MediaStream) => {
      const video = document.createElement('video');
      videoBox.appendChild(video);

      await setStreamAndPlay(video, stream);
    });

    controller.setSendSDPHandler((d: RTCSessionDescription) => {
      sdpSend.value = d.sdp;
    });
  }

  connectOfferButton.addEventListener("click", (e: Event) => {
    initController(WebRTCMode.Offer);

    connectOfferButton.disabled = true;
    connectAnswerButton.disabled = true;
    readSDPButton.disabled = false;

    controller.addStream(stream);
  });
  connectAnswerButton.addEventListener("click", (e: Event) => {
    initController(WebRTCMode.Answer);

    connectOfferButton.disabled = true;
    connectAnswerButton.disabled = true;
    readSDPButton.disabled = false;

    controller.addStream(stream);
  });
  readSDPButton.addEventListener("click", (e: Event) => {
    const sdp = sdpRead.value;
    controller.setReceivedSDP(sdp);
  });

  connectOfferButton.disabled = false;
  connectAnswerButton.disabled = false;

});
