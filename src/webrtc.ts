interface Logger {
  info: (msg: string) => void;
  error: (err: any) => void;
}

export enum WebRTCMode {
  Offer,
  Answer,
}

export class WebRTCController{
  private mode: WebRTCMode
  private log: Logger;
  private conn: RTCPeerConnection;
  private streams = new Map<string, MediaStream>();

  constructor(logger: Logger, mode: WebRTCMode) {
    this.log = logger;
    this.mode = mode;

    let config = {
      iceServers: [
        {urls: "stun:stun.l.google.com:19302"},
      ],
    };

    this.conn = new RTCPeerConnection(config);

    this.conn.addEventListener("track", e => this.handleTrack(e));
    this.conn.addEventListener("icecandidate", e => this.handleIceCandidate(e));
    if (this.isOffer()) {
      this.conn.addEventListener("negotiationneeded", e => this.handleNegotiationNeeded(e));
    }
    this.conn.addEventListener("iceconnectionstatechange", e => this.handleIceConnectionStateChange(e));
  }

  public addStream(stream: MediaStream) {
    stream.getTracks().forEach(track => this.conn.addTrack(track, stream));
  }

  public setReceivedSDP(sdp: string) {
    const type = this.isOffer() ? 'answer' : 'offer';

    const d = new RTCSessionDescription({
      type: type,
      sdp: sdp,
    });

    this.setDescription(d);
  }

  private trackHandler: TrackHandler | null = null;
  public setTrackHandler(f: TrackHandler) {
    this.trackHandler = f;
  }

  private sendSDPHandler: SendSDPHandler | null = null;
  public setSendSDPHandler(f :SendSDPHandler) {
    this.sendSDPHandler = f;
  }

  private handleTrack(e :RTCTrackEvent) {
      this.log.info("event: ontrack");

      e.streams.forEach(stream => {
        let id = stream.id;

        if (this.streams.has(id)) {
          return;
        }

        this.streams.set(id, stream);

        const handler = this.trackHandler;
        if (handler != null) {
          handler(stream);
        }
      });
  }

  private handleIceCandidate(e: RTCPeerConnectionIceEvent) {
      this.log.info("event: onicecandidate");

      if (e.candidate) {
        this.log.info("candidate: " + JSON.stringify(e.candidate));
      } else {
        this.sendSDP(this.conn.localDescription);
      }
  }
  
  private async handleNegotiationNeeded(e: Event) {
    this.log.info("event: onnegotiationneeded");

    try {
      let offer = await this.conn.createOffer();

      await this.conn.setLocalDescription(offer);

      this.sendSDP(this.conn.localDescription);
    } catch (err) {
      this.log.error(err);
    }
  }

  private handleIceConnectionStateChange(e: Event) {
    switch (this.conn.iceConnectionState) {
      case 'failed':
        this.conn.close();
        break;
    }
  }

  private hangup() {
    this.conn.close();
    this.conn.removeEventListener("track", e => this.handleTrack(e));
    this.conn.removeEventListener("icecandidate", e => this.handleIceCandidate(e));
    if (this.isOffer()) {
      this.conn.removeEventListener("negotiationneeded", e => this.handleNegotiationNeeded(e));
    }
    this.conn.removeEventListener("iceconnectionstatechange", e => this.handleIceConnectionStateChange(e));
  }

  private sendSDP(d: RTCSessionDescription | null) {
    if (d == null) {
      return;
    }

    const handler = this.sendSDPHandler;
    if (handler != null) {
      handler(d);
    }
  }

  private async makeAnswer() {
    try{
      let answer = await this.conn.createAnswer();

      await this.conn.setLocalDescription(answer);

      this.sendSDP(this.conn.localDescription);
    } catch(err){
      this.log.error(err);
    }
  }

  private async setDescription(d: RTCSessionDescription) {
    try{
      await this.conn.setRemoteDescription(d);

      if (this.isAnswer()) {
        this.makeAnswer();
      }
    } catch(err){
      this.log.error(err);
    }
  }

  private isOffer(): boolean {
    return this.mode == WebRTCMode.Offer
  }

  private isAnswer(): boolean {
    return this.mode == WebRTCMode.Answer
  }
}

type TrackHandler = (stream: MediaStream) => void;
type SendSDPHandler = (d: RTCSessionDescription) => void;
