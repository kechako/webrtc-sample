export const setStreamAndPlay = (
  video: HTMLVideoElement, stream: MediaStream): Promise<void> => {
    video.srcObject = stream;
    return video.play();
};

export const initPreviewVideo = async (
  video: HTMLVideoElement,
  constraints: MediaStreamConstraints): Promise<MediaStream> => {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  await setStreamAndPlay(video, stream);

  return stream;
};
