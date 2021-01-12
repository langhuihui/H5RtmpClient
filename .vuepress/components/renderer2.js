/**
 * @param opt
 *        container:
 *        contextOptions：
 *        videoBuffer：
 *        forceNoGL：
 *        mute：
 *        decoder：
 * @constructor
 */
function Jessibuca(opt) {
    this.canvasElement = document.createElement("canvas");
    this.canvasElement.style.position = "absolute"
    this.canvasElement.style.top = 0
    this.canvasElement.style.left = 0
    opt.container.appendChild(this.canvasElement)
    this.width = opt.container.clientWidth
    this.height = opt.container.clientHeight
    this.container = opt.container
    this.container.style.overflow = "hidden"
    this.containerOldPostion = {
        position: this.container.style.position,
        top: this.container.style.top,
        left: this.container.style.left,
        width: this.container.style.width,
        height: this.container.style.height
    }
    if (this.containerOldPostion.position != "absolute") {
        this.container.style.position = "relative"
    }
    this.contextOptions = opt.contextOptions;
    this.videoBuffer = opt.videoBuffer || 0;
    this.text = opt.text || '';
    if (!opt.forceNoGL) this.initContextGL();
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.audioEnabled(true);
    if (!opt.isNotMute) this.audioEnabled(false);
    if (this.contextGL) {
        this.initProgram();
        this.initBuffers();
        this.initTextures();
    }
    this.onresize = () => this.resize();
    this.onfullscreenchange = () => this.fullscreenchange();
    window.addEventListener("resize", this.onresize);
    document.addEventListener('fullscreenchange', this.onfullscreenchange);
    this.decoderWorker = new Worker(opt.decoder || 'ff.js')
    var _this = this;
    this.decoderWorker.onmessage = function (event) {
        var msg = event.data
        switch (msg.cmd) {
            case "init":
                console.log("decoder worker init")
                this.postMessage({cmd: "setVideoBuffer", time: _this.videoBuffer})
                if (_this.onLoad) {
                    _this.onLoad()
                    delete _this.onLoad;
                }
                break
            case "initSize":
                _this.canvasElement.width = msg.w
                _this.canvasElement.height = msg.h
                _this.resize()
                console.log("video size:", msg.w, msg.h)
                if (_this.isWebGL()) {

                } else {
                    _this.initRGB(msg.w, msg.h)
                }
                break
            case "render":
                console.log(msg);
                if (_this.contextGL) {
                    _this.drawNextOuptutPictureGL(msg.output);
                } else {
                    _this.drawNextOuptutPictureRGBA(msg.buffer);
                }
                if (_this.loading) {
                    _this.loading = false;
                    _this.onPlay()
                }
                _this._updateBPS(msg.bps);
                break
            case "initAudio":
                _this.initAudioPlay(msg.frameCount, msg.samplerate, msg.channels)
                break
            case "playAudio":
                _this.playAudio(msg.buffer)
                break
            case "print":
                if (_this.onLog) {
                    _this.onLog(msg.text)
                }
                console.log(msg.text);
                break
            case "printErr":
                if (_this.onLog) {
                    _this.onLog(msg.text)
                }
                console.error(msg.text);
                break
            default:
                _this[msg.cmd](msg)
        }
    };
    this.canvasElement.addEventListener('dblclick', function () {
        _this.fullscreen = !_this.fullscreen;
    }, false);
    this.onPlay = noop;
    this.onPause = noop;
    this.onRecord = noop;
    this.doms = _initDom(this.container, opt);
    this._initStatus();
    this._initEventListener();
    this._hideBtns();
};

function noop() {

}

function _initDom(container, opt) {
    var playBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAASAAAAEgARslrPgAAARVJREFUSMe9laEOglAUhs+5k9lJFpsJ5QWMJoNGbEY0mEy+gr6GNo0a3SiQCegMRILzGdw4hl+Cd27KxPuXb2zA/91z2YXoGRERkX4fvN3A2QxUiv4dFM3n8jZRBLbbVfd+ubJuF4xjiCyXkksueb1uSKCIZYGLBTEx8ekEoV7PkICeVgs8HiGyXoO2bUigCDM4HoPnM7bI8wwJ6Gk0sEXbLSay30Oo2TQkoGcwgFCSQMhxDAvoETEscDiQkJC4LjMz8+XyZ4HrFYWjEQqHQ1asWGWZfmdFAsVINxuw00HhbvfpydpvxWkKTqdYaRCUfUPJCdzv4Gr1uqfli0tOIAzByUT/iCrL6+84y3Bw+D6ui5Ou+jwA8FnIO++FACgAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjEtMDEtMDhUMTY6NDI6NTMrMDg6MDCKP7wnAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIxLTAxLTA4VDE2OjQyOjUzKzA4OjAw+2IEmwAAAEl0RVh0c3ZnOmJhc2UtdXJpAGZpbGU6Ly8vaG9tZS9hZG1pbi9pY29uLWZvbnQvdG1wL2ljb25fZ2Y3MDBzN2IzZncvYm9mYW5nLnN2Z8fICi0AAAAASUVORK5CYII=';
    var pauseBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAASAAAAEgARslrPgAAAHVJREFUSMftkCESwCAMBEOnCtdXVMKHeC7oInkEeQJXkRoEZWraipxZc8lsQqQZBACAlIS1oqGhhTCdu3oyxyyMcdRf79c5J7SWDBky+z4173rbJvR+VF/e/qwKqIAKqMBDgZyFzAQCoZTpxq7HLDyOrw/9b07l3z4dDnI2IAAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMS0wMS0wOFQxNjo0Mjo1MyswODowMIo/vCcAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjEtMDEtMDhUMTY6NDI6NTMrMDg6MDD7YgSbAAAASnRFWHRzdmc6YmFzZS11cmkAZmlsZTovLy9ob21lL2FkbWluL2ljb24tZm9udC90bXAvaWNvbl9nZjcwMHM3YjNmdy96YW50aW5nLnN2ZxqNZJkAAAAASUVORK5CYII=';
    var screenshotBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAASAAAAEgARslrPgAAAaxJREFUSMfNlLFOAkEQhmevAZMjR6OGRBJKsFBzdkYNpYSaWkopIOFRCBWh1ieA+ALGRgutjK0HzV2H5SX7W/zsmY3cnTEhcZovOzcz9+/s7Ir8d4OGht7fBwAgjvEri2OTl1ffSf0xAMBxRIkS1e3Se3+vcszEMe/6OqmT/aN2m1wsNu/o5YVsNHI7BgA4PCRfXzfXCwKy1RLbcXZG9nrkzc12jvT8nPU/PtatOThgAx8fuS4WyZ0de2e+T87n5OcnuVqRsxl5cpImQDnKUc7DA1fVqpimZCu+vCSjiNH9PlmpJNTQ0INBErfeafZRAakC6FWKfH9nwU7H/l6rGdqCOx3y7c3U+aOARsMMp+1vNskwTLjulB23XJL1epqA9OshIiKeJxAIoug7UyA4OuLi6Ynr52deu+NjOy4MSc9Ln8rMDpTLybBpaOjdXbJUIqdTm8a/t2fn/RSQewR24HicTLmGhnbdzcPquvYtGY3+PIR24UKBUXd35v6Sk4lN47+9NXm/FBAEedfGTjw9JYdDm76fm6+hoS8ujGAxT6L9Im7bTKeurvIEb92+AES1b6x283XSAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIxLTAxLTA4VDE2OjQyOjUzKzA4OjAwij+8JwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMS0wMS0wOFQxNjo0Mjo1MyswODowMPtiBJsAAABJdEVYdHN2ZzpiYXNlLXVyaQBmaWxlOi8vL2hvbWUvYWRtaW4vaWNvbi1mb250L3RtcC9pY29uX2dmNzAwczdiM2Z3L2NhbWVyYS5zdmeyubWEAAAAAElFTkSuQmCC';
    var fullscreenBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAASAAAAEgARslrPgAAALZJREFUSMftVbsORUAQVSj8DomChvh3lU5CoSVCQq2RObeYu8XG3deVoHCak81kds7Oaz3vxRcAAMwztOg6vX9d6/3XFQQC+b7iAoFhYE7Tvx9EIFAcy/ftO3MQGAQkCfM4MmeZWyajiLnvmYuCeduMAuSzvRBVYNluFHCssSgFp7Sq9ALKkjnPf9ubRtkDL27HNT3QtsY9cAjsNAVheHIKBOwD2wpxFHDbJpwmaHH2L1iWx+2BDy8RbXXtqbRBAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIxLTAxLTA4VDE2OjQyOjUzKzA4OjAwij+8JwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMS0wMS0wOFQxNjo0Mjo1MyswODowMPtiBJsAAABTdEVYdHN2ZzpiYXNlLXVyaQBmaWxlOi8vL2hvbWUvYWRtaW4vaWNvbi1mb250L3RtcC9pY29uX2dmNzAwczdiM2Z3L3F1YW5waW5nenVpZGFodWEuc3ZnTBoI7AAAAABJRU5ErkJggg==';
    var minScreenBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAASAAAAEgARslrPgAAAYJJREFUSMfdVbGKwkAQnQn+geAfWBixUTsVgp3YGKxSWflVNmIjARULwc5KO40ipNHWRgs/wGLniucKa+Jd5ODuuGle5u3szGRmd5bor4iIiMhuB3Sc+HXXBdp2/Lpta7v4dccRJUrUdhtNQIkSVa3C8HwG1uumg34f2OnEB+h0tF1Sv5b+YIsttpZLEhKSdhvscPi8IXFF74GJiYnHY7Cex8zMvFgkbInjmJnv98kqoO30vmhLtaRMB60WtEbDNDudgMUiKiQSzfjOMzFxoQAyCPSfw7/nQZ/PUYnpNGV6OR6BmYzJbzYIoBQCzGaRBDQvJCTdLnTLolg5HN5t6f8V1h/oUT4PrVKJWBotmEzQw+vV3J9Ow851P2/BaoX9Yfh0BrJZYKlk8uUyHOpDeLuBHwzMBJtN2PV6IPUhXK9Nf5cLMAxfluanrmGkRBggtRo03wfq66P/6CsJAnOg+f6rgfZI4BGYiYlHIx048eR6krcnq34kkj1GuVz8+jceo9+SD5A8yGh8CTq7AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIxLTAxLTA4VDE2OjQyOjUzKzA4OjAwij+8JwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMS0wMS0wOFQxNjo0Mjo1MyswODowMPtiBJsAAABNdEVYdHN2ZzpiYXNlLXVyaQBmaWxlOi8vL2hvbWUvYWRtaW4vaWNvbi1mb250L3RtcC9pY29uX2dmNzAwczdiM2Z3L3p1aXhpYW9odWEuc3ZnoCFr0AAAAABJRU5ErkJggg==';
    var quietBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAASAAAAEgARslrPgAAAR9JREFUSMfVlD0LglAYhe9VkwgNihpsjbYQf4JTS7+iuaGxpcGfJjS0NFRLk2NDi6MogafhJGRIX9yEzvJwrx/nvPd9VYh/F3LkyBuN2g3J1QoAgCQhPe/Hxq5Lo+0WlfJ9dYYAgGaTDAIyy/BUnwcwWJlhcLnZkN2ugIBAuy2kkEL2ep8F73S4kjfFcfn6cMj9KLodrWVBiXyf75tMyOOR+4MBOZ8XLXzorboA5UpnM/J0Ivd7+vX7xX2asqGpVKtFXi5sqWmypXefrfIWAACmU/JwKCoun8hu9zA0uk6u13wgirg+n7+bAcsibbt6SB3n9TQXPxwAwHJJpum7M6BcDDQa0SgMaw9QPkJNIxcLMo4ZcDz+eYDqQFLWbqxKV57EtW1WtMbmAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIxLTAxLTA4VDE2OjQyOjUzKzA4OjAwij+8JwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMS0wMS0wOFQxNjo0Mjo1MyswODowMPtiBJsAAABKdEVYdHN2ZzpiYXNlLXVyaQBmaWxlOi8vL2hvbWUvYWRtaW4vaWNvbi1mb250L3RtcC9pY29uX2dmNzAwczdiM2Z3L2ppbmd5aW4uc3ZnIlMYaQAAAABJRU5ErkJggg==';
    var playAudioBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAASAAAAEgARslrPgAAAU5JREFUSMftkzGKwlAURf9PULBQwULSCKK1bZAgNuoaFFyAC3AdZg0uQCwshWzAShEEO7Gy0soUCu9Occ3An5nMGCfdzGsO7+Xy3/03iVL/lbAAACiVIBCI77O37Vi9QCDZbEqLm03ycEBUAoHk818v7nYpul5Jz4tf8HBKYa1mcjwmbzd8rG8NFIsU7ffk8UjmcjE3XK+RtB4G2PT75GbDeblMttumfjSKMRCGLxsQCKTReE9KIJDJxDw/SmKxiOZWWh+ntrSlre2WXRAorbTSrZapip7X66kbMKtQUFBQCENznsmQ93vqBhh5r8fO85jAcsnIrcce1yV3uxgD8zl5uZgU+dGBVlrp6GbTKRPwffaDAek45Gz2/M0AAJ0OeTol+w0rFYrOZ3K1MhNJEjEAwHF4cBA8Z8B1zcXV6msv+JMR2yaHQ1LrXx/8Z+sNRxsWcwZeb6UAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjEtMDEtMDhUMTY6NDI6NTMrMDg6MDCKP7wnAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIxLTAxLTA4VDE2OjQyOjUzKzA4OjAw+2IEmwAAAEt0RVh0c3ZnOmJhc2UtdXJpAGZpbGU6Ly8vaG9tZS9hZG1pbi9pY29uLWZvbnQvdG1wL2ljb25fZ2Y3MDBzN2IzZncvc2hlbmd5aW4uc3ZnFog1MQAAAABJRU5ErkJggg==';
    var recordBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAASAAAAEgARslrPgAAAPRJREFUSMflVDEOwjAQO0e8gr2sZYVunREbD6ISfAgmkBjpC/hBEQ+AtTWD6QAI0gBlqRfLp+TiXC5n1nXgMUCS5HBoNBqj6IOMMFwuEpsNAABl6d3HihWrOJaBsuRPkGW+c929HAxuYefb6L+R0ZgkMrJYiItCnCT1sl5Y1jwXj0bNniJNJWqujfX7LyrwJh8AYDxWgulU0dPp20IFlxoODm61kpE4VnS9/puBXyPYgH7LbKY3PhwUnUw+NdC4CdW9+71UgyZspwIBB9No3O0klktxUahyx+Pz+lYG0Xzu84lXRqTqwRQAGAzns8R223gUdxZXGcAK5Hp0ClIAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjEtMDEtMDhUMTY6NDI6NTMrMDg6MDCKP7wnAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIxLTAxLTA4VDE2OjQyOjUzKzA4OjAw+2IEmwAAAE50RVh0c3ZnOmJhc2UtdXJpAGZpbGU6Ly8vaG9tZS9hZG1pbi9pY29uLWZvbnQvdG1wL2ljb25fZ2Y3MDBzN2IzZncvbHV6aGlzaGlwaW4uc3Zn5Zd7GQAAAABJRU5ErkJggg==';
    var recordingBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAASAAAAEgARslrPgAAAahJREFUSMdjYBjpgBFd4NZK+f+soQYG//T+yzFuUFUl2cApjEWM/758UZvysPDn3127GBkZGBgY/v4l6ICb9xTWsRbp6/9f9W8N44Jz5xgCGI4wfGFiIttrR/5n/3/U3KyR8rj8t0RdHS5lcAv+//yXzzhZTY1ii2FAmsGZocna+maD3GnWY62tNzbJBbDOffLkxie5eJYwa2uYMhaigzb2/zyGguPH/y9mTGKYYGlJUIMiYxDjHCen/4oMDAxznJzg4k8Z/jP+l5LCCAFCQP30Y5dfXVZWDI7/zzIs8PNjNGJ4/7/r+XNKA4rkoNZ4/lj0V9TmzUxJv0J+F+jrM3YyvPq/acsWujmA2oBkB9y4LifLxhoa+teAzYFtwtWr/8sZxBj9fHxo7oCbprJ72MqOHWNgZGBkYFy1isGGoZahTFSU0hAgOhcQnfph4P7/df9T9u1jPMn4nyHmxIn/bAzLGe7GxTHsZyj+f+zpUwYGBmmG6bQsiMr+L/v/rqlJY9Njm9889fW4lGEUxXCHwAomUgH3vxBG8c+f1WWf9P98sns3oaJ4FAAAbtWqHTT84QYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjEtMDEtMDhUMTY6MzU6MjMrMDg6MDBLHbvEAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIxLTAxLTA4VDE2OjM1OjIzKzA4OjAwOkADeAAAAE50RVh0c3ZnOmJhc2UtdXJpAGZpbGU6Ly8vaG9tZS9hZG1pbi9pY29uLWZvbnQvdG1wL2ljb25fcTM1YTFhNHBtY2MvbHV6aGlzaGlwaW4uc3Zn6xlv1QAAAABJRU5ErkJggg==';
    var gifBase64 = 'data:image/gif;base64,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';
    var playBigBase64 = 'data:image/png;base64,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';

    function _setStyle(dom, cssObj) {
        Object.keys(cssObj).forEach(function (key) {
            dom.style[key] = cssObj[key];
        })
    }

    var fragment = document.createDocumentFragment();
    var btnWrap = document.createElement('div');
    var control1 = document.createElement('div');
    var control2 = document.createElement('div');
    var textDom = document.createElement('div');
    var speedDom = document.createElement('div');
    var playDom = document.createElement('div');
    var playBigDom = document.createElement('div');
    var pauseDom = document.createElement('div');
    var screenshotsDom = document.createElement('div');
    var fullscreenDom = document.createElement('div');
    var minScreenDom = document.createElement('div');
    var loadingDom = document.createElement('div');
    var loadingTextDom = document.createElement('div');
    var quietAudioDom = document.createElement('div');
    var playAudioDom = document.createElement('div');
    var recordDom = document.createElement('div');
    var recordingDom = document.createElement('div');
    var bgDom = document.createElement('div');

    loadingTextDom.innerText = opt.loadingText || '加载中......';
    textDom.innerText = opt.text || 'DB';
    speedDom.innerText = '';
    playDom.title = '播放';
    pauseDom.title = '暂停';
    screenshotsDom.title = '截屏';
    fullscreenDom.title = '全屏';
    minScreenDom.title = '退出全屏';
    quietAudioDom.title = '静音';
    playAudioDom.title = '取消静音';
    recordDom.title = '录制';
    recordingDom.title = '取消录制';


    var wrapStyle = {
        height: '25px',
        zIndex: 11,
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: '100%',
        background: 'rgba(0,0,0)'
    };

    var bgStyle = {
        position: 'absolute',
        width: '100%',
        height: '100%',
    };

    if (opt.background) {
        bgStyle = Object.assign({}, bgStyle, {
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: '100%',
            backgroundImage: "url('" + opt.background + "')"
        })
    }

    //
    var loadingStyle = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        textAlign: 'center',
        color: "#fff",
        display: 'none',
        backgroundImage: "url('" + gifBase64 + "')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "40px 40px",
    };

    var playBigStyle = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        display: 'none',
        background: 'rgba(0,0,0,0.4)',
        backgroundImage: "url('" + playBigBase64 + "')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "48px 48px",
        cursor: "pointer"
    };

    var loadingTextStyle = {
        position: 'absolute',
        width: "100%",
        top: '60%',
        textAlign: 'center',
    }

    var controlStyle = {
        position: 'absolute',
        top: 0,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
    };
    var styleObj = {
        display: 'none',
        position: 'relative',
        fontSize: '13px',
        color: '#fff',
        lineHeight: '20px',
        marginLeft: '5px',
        marginRight: '5px',
    };

    var styleObj2 = {
        display: 'none',
        position: 'relative',
        width: '15px',
        height: '15px',
        marginLeft: '5px',
        marginRight: '5px',
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: '100%',
        cursor: 'pointer',
    };

    _setStyle(bgDom, bgStyle);
    _setStyle(btnWrap, wrapStyle);
    _setStyle(loadingDom, loadingStyle);
    _setStyle(playBigDom, playBigStyle);
    _setStyle(loadingTextDom, loadingTextStyle);
    _setStyle(control1, Object.assign({}, controlStyle, {
        left: 0
    }));
    _setStyle(control2, Object.assign({}, controlStyle, {
        right: 0
    }));
    _setStyle(textDom, styleObj);
    _setStyle(speedDom, styleObj);
    _setStyle(playDom, Object.assign({}, styleObj2, {
        backgroundImage: "url('" + playBase64 + "')",
    }));

    _setStyle(pauseDom, Object.assign({}, styleObj2, {
        backgroundImage: "url('" + pauseBase64 + "')"
    }));

    _setStyle(screenshotsDom, Object.assign({}, styleObj2, {
        backgroundImage: "url('" + screenshotBase64 + "')"
    }));

    _setStyle(fullscreenDom, Object.assign({}, styleObj2, {
        backgroundImage: "url('" + fullscreenBase64 + "')"
    }));

    _setStyle(minScreenDom, Object.assign({}, styleObj2, {
        backgroundImage: "url('" + minScreenBase64 + "')"
    }));

    _setStyle(quietAudioDom, Object.assign({}, styleObj2, {
        backgroundImage: "url('" + quietBase64 + "')"
    }));

    _setStyle(playAudioDom, Object.assign({}, styleObj2, {
        backgroundImage: "url('" + playAudioBase64 + "')"
    }));

    _setStyle(recordDom, Object.assign({}, styleObj2, {
        backgroundImage: "url('" + recordBase64 + "')"
    }));

    _setStyle(recordingDom, Object.assign({}, styleObj2, {
        backgroundImage: "url('" + recordingBase64 + "')"
    }));

    loadingDom.appendChild(loadingTextDom);
    control1.appendChild(textDom);
    control1.appendChild(speedDom);

    // record
    control2.appendChild(recordingDom);
    control2.appendChild(recordDom);

    // screenshots
    control2.appendChild(screenshotsDom);
    // play stop
    control2.appendChild(playDom);
    control2.appendChild(pauseDom);
    // audio
    control2.appendChild(playAudioDom);
    control2.appendChild(quietAudioDom);
    // fullscreen
    control2.appendChild(fullscreenDom);
    control2.appendChild(minScreenDom);

    btnWrap.appendChild(control1);
    btnWrap.appendChild(control2);

    fragment.appendChild(bgDom);
    fragment.appendChild(loadingDom);
    fragment.appendChild(btnWrap);
    fragment.appendChild(playBigDom);


    container.appendChild(fragment);
    return {
        textDom,
        speedDom,
        playDom,
        pauseDom,
        loadingDom,
        screenshotsDom,
        fullscreenDom,
        minScreenDom,
        playAudioDom,
        quietAudioDom,
        recordDom,
        recordingDom,
        bgDom,
        playBigDom
    };
}

Jessibuca.prototype._initEventListener = function () {
    var _this = this;
    this.doms.playDom.addEventListener('click', function (e) {
        e.stopPropagation();
        _this.play();
        _this.playing = true;
    }, false);

    this.doms.playBigDom.addEventListener('click', function (e) {
        e.stopPropagation();
        _this.play();
        _this.playing = true;
    }, false);


    this.doms.pauseDom.addEventListener('click', function (e) {
        e.stopPropagation();
        _this.pause();
        _this.playing = false;
    }, false);

    // screenshots
    this.doms.screenshotsDom.addEventListener('click', function (e) {
        e.stopPropagation();
        const dataURL = _this.canvasElement.toDataURL('image/png');
        _downloadImg(_dataURLToFile(dataURL), _this.text);
    }, false);
    //
    this.doms.fullscreenDom.addEventListener('click', function (e) {
        e.stopPropagation();
        _this.fullscreen = true;
    }, false);
    //
    this.doms.minScreenDom.addEventListener('click', function (e) {
        e.stopPropagation();
        _this.fullscreen = false;
    }, false);
    //
    this.doms.recordDom.addEventListener('click', function (e) {
        e.stopPropagation();
        _this.onRecord(true);
        _this.recording = true;
    }, false);
    //
    this.doms.recordingDom.addEventListener('click', function (e) {
        e.stopPropagation();
        _this.onRecord(false);
        _this.recording = false;
    }, false);

    this.doms.quietAudioDom.addEventListener('click', function (e) {
        e.stopPropagation();
        _this.audioEnabled(true);
        _this.quieting = false;
    }, false);

    this.doms.playAudioDom.addEventListener('click', function (e) {
        e.stopPropagation();
        _this.audioEnabled(false);
        _this.quieting = true;
    }, false);
};

Jessibuca.prototype._initStatus = function () {
    this.recording = false;
    this.playing = false;
    this.quieting = true;
    this.fullscreen = false;
}

Jessibuca.prototype._initBtns = function () {
    // show
    _domToggle(this.doms.pauseDom, true);
    _domToggle(this.doms.screenshotsDom, true);
    _domToggle(this.doms.fullscreenDom, true);
    _domToggle(this.doms.quietAudioDom, true);
    _domToggle(this.doms.textDom, true);
    _domToggle(this.doms.speedDom, true);
    _domToggle(this.doms.recordDom, true);
    // hide
    _domToggle(this.doms.loadingDom, false);
    _domToggle(this.doms.playDom, false);
    _domToggle(this.doms.playBigDom, false);
};

Jessibuca.prototype._hideBtns = function () {
    var _this = this;
    Object.keys(this.doms).forEach(function (dom) {
        _domToggle(_this.doms[dom], false);
    })
};


function _throttle(fn, wait) {
    var pre = new Date();
    return function () {
        const args = arguments;
        var now = new Date();

        if (now - pre > wait) {
            fn.apply(this, args);
            pre = new Date();
        }
    };
}

function _checkFull() {
    var isFull = document.fullscreenElement || window.webkitFullscreenElement || document.msFullscreenElement;
    if (isFull === undefined) isFull = false;
    return !!isFull;
}

var _startTime = '';
var _bps = 0;
Jessibuca.prototype._updateBPS = function (bps) {
    if (!_startTime) {
        _startTime = new Date().getTime();
    }
    var _now = new Date().getTime();
    var timestamp = _now - _startTime;

    if (timestamp < 1 * 1000) {
        _bps += bps;
        return;
    }
    this.doms.speedDom.innerText = _bpsSize(_bps);
    _bps = 0;
    _startTime = _now;
}

Jessibuca.prototype.initAudioPlanar = function (msg) {
    var channels = msg.channels
    var samplerate = msg.samplerate
    console.log("initAudioPlanar:", "channles:", channels, "samplerate:", samplerate)
    var context = this.audioContext;
    var isPlaying = false;
    var audioBuffers = [];
    if (!context) return false;
    var _this = this
    this.playAudio = function (buffer) {
        var frameCount = buffer[0][0].length
        var audioBuffer = context.createBuffer(channels, frameCount * buffer.length, samplerate);
        var copyToCtxBuffer = function (fromBuffer) {
            for (var channel = 0; channel < channels; channel++) {
                var nowBuffering = audioBuffer.getChannelData(channel);
                for (var j = 0; j < buffer.length; j++) {
                    for (var i = 0; i < frameCount; i++) {
                        nowBuffering[i + j * frameCount] = fromBuffer[j][channel][i]
                    }
                    //postMessage({ cmd: "setBufferA", buffer: fromBuffer[j] }, '*', fromBuffer[j].map(x => x.buffer))
                }
            }
        }
        var playNextBuffer = function () {
            isPlaying = false;
            //console.log("~", audioBuffers.length)
            if (audioBuffers.length) {
                playAudio(audioBuffers.shift());
            }
            //if (audioBuffers.length > 1) audioBuffers.shift();
        };
        var playAudio = function (fromBuffer) {
            if (!fromBuffer) return
            if (isPlaying) {
                audioBuffers.push(fromBuffer);
                //console.log(audioBuffers.length)
                return;
            }
            isPlaying = true;
            copyToCtxBuffer(fromBuffer);
            var source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(context.destination);
            // source.onended = playNextBuffer;
            source.start();
        };
        _this.playAudio = playAudio
        _this.audioInterval = setInterval(playNextBuffer, audioBuffer.duration * 1000);
        playAudio(buffer)
    };
}

function _unlock(context) {
    context.resume();
    var source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, 22050);
    source.connect(context.destination);
    if (source.noteOn)
        source.noteOn(0);
    else
        source.start(0);
}

function _domToggle(dom, toggle) {
    if (dom) {
        dom.style.display = toggle ? 'block' : "none";
    }
}

function _dataURLToFile(dataURL) {
    const arr = dataURL.split(",");
    const bstr = atob(arr[1]);
    const type = arr[0].replace("data:", "").replace(";base64", "")
    let n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], 'file', {type});
}

function _downloadImg(content, text) {
    const aLink = document.createElement("a");
    aLink.download = text + '' + new Date().getTime();
    aLink.href = URL.createObjectURL(content);
    aLink.click();
    URL.revokeObjectURL(content);
}

function _bpsSize(value) {
    if (null == value || value == '') {
        return "0 KB/S";
    }
    var srcsize = parseFloat(value);
    var size = srcsize / 1024;
    size = size.toFixed(2);
    return size + 'KB/S';
}

/**
 * set audio
 * @param flag
 */
Jessibuca.prototype.audioEnabled = function (flag) {
    if (flag) {
        _unlock(this.audioContext)
        this.audioEnabled = function (flag) {
            if (flag) {
                // 恢复
                this.audioContext.resume();
            } else {
                // 暂停
                this.audioContext.suspend();
            }
        }
    } else {
        this.audioContext.suspend();
    }
}

Jessibuca.prototype.playAudio = function (data) {
    var context = this.audioContext;
    var isPlaying = false;
    var isDecoding = false;
    if (!context) return false;
    var audioBuffers = [];
    var decodeQueue = []
    var _this = this
    var playNextBuffer = function (e) {
        if (audioBuffers.length) {
            playBuffer(audioBuffers.shift())
        }
    };
    var playBuffer = function (buffer) {
        isPlaying = true;
        var audioBufferSouceNode = context.createBufferSource();
        audioBufferSouceNode.buffer = buffer;
        audioBufferSouceNode.connect(context.destination);
        // audioBufferSouceNode.onended = playNextBuffer;
        audioBufferSouceNode.start();
        if (!_this.audioInterval) {
            _this.audioInterval = setInterval(playNextBuffer, buffer.duration * 1000 - 1);
        }
    }
    var decodeAudio = function () {
        if (decodeQueue.length) {
            context.decodeAudioData(decodeQueue.shift(), tryPlay, decodeAudio);
        } else {
            isDecoding = false
        }
    }
    var tryPlay = function (buffer) {
        decodeAudio()
        if (isPlaying) {
            audioBuffers.push(buffer);
        } else {
            playBuffer(buffer)
        }
    }
    var playAudio = function (data) {
        decodeQueue.push(...data)
        if (!isDecoding) {
            isDecoding = true
            decodeAudio()
        }
    }
    this.playAudio = playAudio
    playAudio(data)
}
Jessibuca.prototype.initAudioPlay = function (frameCount, samplerate, channels) {
    var context = this.audioContext;
    var isPlaying = false;
    var audioBuffers = [];
    if (!context) return false;
    var _this = this
    var resampled = samplerate < 22050;
    if (resampled) {
        console.log("resampled!")
    }
    var audioBuffer = resampled ? context.createBuffer(channels, frameCount << 1, samplerate << 1) : context.createBuffer(channels, frameCount, samplerate);
    var playNextBuffer = function () {
        isPlaying = false;
        //console.log("~", audioBuffers.length)
        if (audioBuffers.length) {
            playAudio(audioBuffers.shift());
        }
    };

    var copyToCtxBuffer = channels > 1 ? function (fromBuffer) {
        for (var channel = 0; channel < channels; channel++) {
            var nowBuffering = audioBuffer.getChannelData(channel);
            if (resampled) {
                for (var i = 0; i < frameCount; i++) {
                    nowBuffering[i * 2] = nowBuffering[i * 2 + 1] = fromBuffer[i * (channel + 1)] / 32768;
                }
            } else
                for (var i = 0; i < frameCount; i++) {
                    nowBuffering[i] = fromBuffer[i * (channel + 1)] / 32768;
                }

        }
    } : function (fromBuffer) {
        var nowBuffering = audioBuffer.getChannelData(0);
        for (var i = 0; i < nowBuffering.length; i++) {
            nowBuffering[i] = fromBuffer[i] / 32768;
        }
    };
    var playAudio = function (fromBuffer) {
        if (isPlaying) {
            audioBuffers.push(fromBuffer);
            return;
        }
        isPlaying = true;
        copyToCtxBuffer(fromBuffer);
        var source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        if (!_this.audioInterval) {
            _this.audioInterval = setInterval(playNextBuffer, audioBuffer.duration * 1000);
        }
        source.start();
    };
    this.playAudio = playAudio;
}
/**
 * Returns true if the canvas supports WebGL
 */
Jessibuca.prototype.isWebGL = function () {
    return !!this.contextGL;
};

/**
 * Create the GL context from the canvas element
 */
Jessibuca.prototype.initContextGL = function () {
    var canvas = this.canvasElement;
    var gl = null;

    var validContextNames = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"];
    var nameIndex = 0;

    while (!gl && nameIndex < validContextNames.length) {
        var contextName = validContextNames[nameIndex];

        try {
            var contextOptions = {preserveDrawingBuffer: true};
            if (this.contextOptions) {
                contextOptions = Object.assign(contextOptions, this.contextOptions);
            }

            gl = canvas.getContext(contextName, contextOptions);
        } catch (e) {
            gl = null;
        }

        if (!gl || typeof gl.getParameter !== "function") {
            gl = null;
        }

        ++nameIndex;
    }
    ;

    this.contextGL = gl;
};

/**
 * Initialize GL shader program
 */
Jessibuca.prototype.initProgram = function () {
    var gl = this.contextGL;

    var vertexShaderScript = [
        'attribute vec4 vertexPos;',
        'attribute vec4 texturePos;',
        'varying vec2 textureCoord;',

        'void main()',
        '{',
        'gl_Position = vertexPos;',
        'textureCoord = texturePos.xy;',
        '}'
    ].join('\n');

    var fragmentShaderScript = [
        'precision highp float;',
        'varying highp vec2 textureCoord;',
        'uniform sampler2D ySampler;',
        'uniform sampler2D uSampler;',
        'uniform sampler2D vSampler;',
        'const mat4 YUV2RGB = mat4',
        '(',
        '1.1643828125, 0, 1.59602734375, -.87078515625,',
        '1.1643828125, -.39176171875, -.81296875, .52959375,',
        '1.1643828125, 2.017234375, 0, -1.081390625,',
        '0, 0, 0, 1',
        ');',

        'void main(void) {',
        'highp float y = texture2D(ySampler,  textureCoord).r;',
        'highp float u = texture2D(uSampler,  textureCoord).r;',
        'highp float v = texture2D(vSampler,  textureCoord).r;',
        'gl_FragColor = vec4(y, u, v, 1) * YUV2RGB;',
        '}'
    ].join('\n');

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderScript);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.log('Vertex shader failed to compile: ' + gl.getShaderInfoLog(vertexShader));
    }

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderScript);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.log('Fragment shader failed to compile: ' + gl.getShaderInfoLog(fragmentShader));
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log('Program failed to compile: ' + gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);

    this.shaderProgram = program;
};

/**
 * Initialize vertex buffers and attach to shader program
 */
Jessibuca.prototype.initBuffers = function () {
    var gl = this.contextGL;
    var program = this.shaderProgram;

    var vertexPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]), gl.STATIC_DRAW);

    var vertexPosRef = gl.getAttribLocation(program, 'vertexPos');
    gl.enableVertexAttribArray(vertexPosRef);
    gl.vertexAttribPointer(vertexPosRef, 2, gl.FLOAT, false, 0, 0);

    var texturePosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texturePosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);

    var texturePosRef = gl.getAttribLocation(program, 'texturePos');
    gl.enableVertexAttribArray(texturePosRef);
    gl.vertexAttribPointer(texturePosRef, 2, gl.FLOAT, false, 0, 0);

    this.texturePosBuffer = texturePosBuffer;
};

/**
 * Initialize GL textures and attach to shader program
 */
Jessibuca.prototype.initTextures = function () {
    var gl = this.contextGL;
    var program = this.shaderProgram;

    var yTextureRef = this.initTexture();
    var ySamplerRef = gl.getUniformLocation(program, 'ySampler');
    gl.uniform1i(ySamplerRef, 0);
    this.yTextureRef = yTextureRef;

    var uTextureRef = this.initTexture();
    var uSamplerRef = gl.getUniformLocation(program, 'uSampler');
    gl.uniform1i(uSamplerRef, 1);
    this.uTextureRef = uTextureRef;

    var vTextureRef = this.initTexture();
    var vSamplerRef = gl.getUniformLocation(program, 'vSampler');
    gl.uniform1i(vSamplerRef, 2);
    this.vTextureRef = vTextureRef;
};

/**
 * Create and configure a single texture
 */
Jessibuca.prototype.initTexture = function () {
    var gl = this.contextGL;

    var textureRef = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureRef);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return textureRef;
};

/**
 * Draw picture data to the canvas.
 * If this object is using WebGL, the data must be an I420 formatted ArrayBuffer,
 * Otherwise, data must be an RGBA formatted ArrayBuffer.
 */
Jessibuca.prototype.drawNextOutputPicture = function (data) {
    if (this.contextGL) {
        this.drawNextOuptutPictureGL(data);
    } else {
        this.drawNextOuptutPictureRGBA(data);
    }
};

/**
 * Draw the next output picture using WebGL
 */
Jessibuca.prototype.drawNextOuptutPictureGL = function (data) {
    var gl = this.contextGL;
    var texturePosBuffer = this.texturePosBuffer;
    var yTextureRef = this.yTextureRef;
    var uTextureRef = this.uTextureRef;
    var vTextureRef = this.vTextureRef;
    var croppingParams = this.croppingParams
    var width = this.canvasElement.width
    var height = this.canvasElement.height
    if (croppingParams) {
        gl.viewport(0, 0, croppingParams.width, croppingParams.height);
        var tTop = croppingParams.top / height;
        var tLeft = croppingParams.left / width;
        var tBottom = croppingParams.height / height;
        var tRight = croppingParams.width / width;
        var texturePosValues = new Float32Array([tRight, tTop, tLeft, tTop, tRight, tBottom, tLeft, tBottom]);

        gl.bindBuffer(gl.ARRAY_BUFFER, texturePosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texturePosValues, gl.DYNAMIC_DRAW);
    } else {
        gl.viewport(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, yTextureRef);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data[0]);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, uTextureRef);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width / 2, height / 2, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data[1]);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, vTextureRef);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width / 2, height / 2, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data[2]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

/**
 * Draw next output picture using ARGB data on a 2d canvas.
 */
Jessibuca.prototype.drawNextOuptutPictureRGBA = function (data) {
    // var canvas = this.canvasElement;
    //var argbData = data;
    //var ctx = canvas.getContext('2d');
    // var imageData = ctx.getImageData(0, 0, width, height);
    //this.imageData = this.ctx2d.getImageData(0, 0, width, height);
    this.imageData.data.set(data);
    //Module.print(typeof this.imageData.data);
    var croppingParams = this.croppingParams
    if (!croppingParams) {
        this.ctx2d.putImageData(this.imageData, 0, 0);
    } else {
        this.ctx2d.putImageData(this.imageData, -croppingParams.left, -croppingParams.top, 0, 0, croppingParams.width, croppingParams.height);
    }
};
Jessibuca.prototype.ctx2d = null;
Jessibuca.prototype.imageData = null;
Jessibuca.prototype.initRGB = function (width, height) {
    this.ctx2d = this.canvasElement.getContext('2d');
    this.imageData = this.ctx2d.getImageData(0, 0, width, height);
    this.clear = function () {
        this.ctx2d.clearRect(0, 0, width, height)
    };
    //Module.print(this.imageData);
};

Jessibuca.prototype.pause = function () {
    this.close();
    this.onPause();
};

Jessibuca.prototype.close = function () {
    if (this.audioInterval) {
        clearInterval(this.audioInterval)
    }
    delete this.playAudio
    this.decoderWorker.postMessage({cmd: "close"})
    // this.contextGL.clear(this.contextGL.COLOR_BUFFER_BIT);
}
Jessibuca.prototype.destroy = function () {
    // destroy
    this.decoderWorker.terminate()
    window.removeEventListener("resize", this.onresize);
    window.removeEventListener('fullscreenchange', this.onfullscreenchange);
}
/**
 * play
 * @param url
 */
Jessibuca.prototype.play = function (url) {
    var needDelay = false;
    if (url) {
        if (this.playUrl) {
            this.close();
            needDelay = true;
            this.contextGL.clear(this.contextGL.COLOR_BUFFER_BIT);
        }
        this.loading = true;
        this.playUrl = url;
    } else if (this.playUrl) {
        url = this.playUrl;
        this.onPlay();
    }
    if (needDelay) {
        var _this = this;
        setTimeout(function () {
            _this.decoderWorker.postMessage({cmd: "play", url: url, isWebGL: _this.isWebGL()})
        }, 300);
    } else {
        this.decoderWorker.postMessage({cmd: "play", url: url, isWebGL: this.isWebGL()})
    }
}

Object.defineProperty(Jessibuca.prototype, "fullscreen", {
    set(value) {
        if (value) {
            if (!_checkFull()) {
                this.container.requestFullscreen();
            }
            _domToggle(this.doms.minScreenDom, true);
            _domToggle(this.doms.fullscreenDom, false);
        } else {
            if (_checkFull()) {
                document.exitFullscreen();
            }
            _domToggle(this.doms.minScreenDom, false);
            _domToggle(this.doms.fullscreenDom, true);
        }
        this._isFullscreen = value;
    },
    get() {
        return this._isFullscreen;
    }
});

Object.defineProperty(Jessibuca.prototype, 'playing', {
    set(value) {
        if (value) {
            _domToggle(this.doms.playBigDom, false);
            _domToggle(this.doms.playDom, false);
            _domToggle(this.doms.pauseDom, true);
        } else {
            this.doms.speedDom.innerText = '';
            _domToggle(this.doms.playDom, true);
            _domToggle(this.doms.playBigDom, true);
            _domToggle(this.doms.pauseDom, false);
        }
        this._playing = value;
    },
    get() {
        return this._playing;
    }
});

Object.defineProperty(Jessibuca.prototype, 'recording', {
    set(value) {
        if (value) {
            _domToggle(this.doms.recordDom, false);
            _domToggle(this.doms.recordingDom, true);
        } else {
            _domToggle(this.doms.recordDom, true);
            _domToggle(this.doms.recordingDom, false);
        }
        this._recording = value;
    },
    get() {
        return this._recording;
    }
});

Object.defineProperty(Jessibuca.prototype, 'quieting', {
    set(value) {
        if (value) {
            _domToggle(this.doms.quietAudioDom, true);
            _domToggle(this.doms.playAudioDom, false);
        } else {
            _domToggle(this.doms.quietAudioDom, false);
            _domToggle(this.doms.playAudioDom, true);

        }
        this._quieting = value;
    },
    get() {
        return this._quieting;
    }
});


Object.defineProperty(Jessibuca.prototype, 'loading', {
    set(value) {
        if (value) {
            this._hideBtns();
            _domToggle(this.doms.loadingDom, true);
        } else {
            this._initBtns();
        }
        this._loading = value;
    },
    get() {
        return this._loading;
    }
});


/**
 * resize
 */
Jessibuca.prototype.resize = function () {
    this.width = this.container.clientWidth
    this.height = this.container.clientHeight - 25;
    var wScale = this.width / this.canvasElement.width
    var hScale = this.height / this.canvasElement.height
    var scale = wScale > hScale ? hScale : wScale
    this.canvasElement.style.transform = "scale(" + scale + ")"
    this.canvasElement.style.left = ((this.width - this.canvasElement.width) / 2) + "px"
    this.canvasElement.style.top = ((this.height - this.canvasElement.height) / 2) + "px"

    if (!_checkFull()) {
        this.fullscreen = false;
    }
}


Jessibuca.prototype.fullscreenchange = function () {
    this.fullscreen = _checkFull();
}
/**
 * change buffer
 * @param buffer
 */
Jessibuca.prototype.changeBuffer = function (buffer) {
    this.decoderWorker.postMessage({cmd: "setVideoBuffer", time: Number(buffer)});
}

export default Jessibuca