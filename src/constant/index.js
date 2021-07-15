export const DEFAULT_OPTIONS = {
    videoBuffer: 0.5,
    vod: false,
    isResize: true,
    isFullSize: false,
    debug: false,
    timeout: 30,
    supportDblclickFullscreen: false,
    showBandwidth: false,
    keepScreenOn: false,
    isNotMute: false,
    hasAudio: true,
    operateBtns: {
        fullscreen: false,
        screenshot: false,
        play: false,
        audio: false
    },
    loadingText: '',
    background: '',
    decoder: 'index.js',
    rotate: 0,
    forceNoOffscreen: false
}

export const CMD_TYPE = {
    init: 'init',
    initSize: 'initSize',
    render: 'render',
    playAudio: 'playAudio',
    print: 'print',
    printErr: 'printErr',
    initAudioPlanar: 'initAudioPlanar',
    kBps: 'kBps',
}

export const POST_MESSAGE = {
    close: "close",
    play: 'play',
    setVideoBuffer: 'setVideoBuffer',
    init: 'init',
    pushingData: 'pushingData'
}

//
export const EVEMTS = {
    fullscreen: 'fullscreen',
    play: 'play',
    pause: 'pause',
    mute: 'mute',
    load: 'load',
    videoInfo: 'videoInfo',
    timeUpdate: 'timeUpdate',
    audioInfo: "audioInfo",
    log: 'log',
    error: "error",
    kBps: 'kBps',
    timeout: 'timeout',
    stats: 'stats',
    performance: "performance",
    record: 'record',
    buffer: 'buffer',
    videoFrame: 'videoFrame',
    start: 'start',
    metadata: 'metadata'
}

export const BUFFER_STATUS = {
    empty: 'empty',
    buffering: 'buffering',
    full: 'full'
}