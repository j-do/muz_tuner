var muzTuner = angular.module('muzTuner', []);
muzTuner.factory('FrequencyAnalysisFactory', function() {
    var audioContext = new AudioContext();
    var analyser = null;
    var freqDomain = null;
    var analysis = {
        bins: [],
        sensitivity: -64,
        frequency: 0,
        volume: 0
    };

    function Point(x, y) {
        this.x = x;
        this.y = y;
    }

    function initStream(success) {
        navigator.mozGetUserMedia({audio: true}, success, onError);
    }

    function getStream(stream) {
        window.source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.smoothingTimeConstant = 0.81;
        source.connect(analyser);
    }

    function loopGuts() {
        updateFloatFreqDomain();
        var maxAmp = Math.max.apply(Math, freqDomain);

        if (maxAmp > analysis.sensitivity) {
            var maxBin = [].indexOf.call(freqDomain, maxAmp);
            if (maxBin > 1) {
                analysis.frequency = getFreqEstimate(maxBin, maxAmp);
            } else {
                analysis.frequency = getFreqEstimate(maxBin, maxAmp);
            }
        } else {
            analysis.frequency = 0;
        }
        analysis.volume = maxAmp;
    }



    function getFreqEstimate(maxBin, maxAmp) {
        var midPoint = new Point(getFreqFromIndex(maxBin), maxAmp);
        var leftPoint = new Point(getFreqFromIndex(maxBin - 1), freqDomain[maxBin - 1]);
        var rightPoint = new Point(getFreqFromIndex(maxBin + 1), freqDomain[maxBin + 1]);
        var vertex = threePointQuadraticInterpolation(leftPoint, midPoint, rightPoint);
        return vertex.x;
    }

    function updateFreqDomain() {
        freqDomain = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqDomain);
    }

    function updateFloatFreqDomain() {
        freqDomain = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(freqDomain);
    }

    function updateTimeDomain() {
        timeDomain = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(timeDomain);
    }

    function getIndexFromFreq(frequency) {
        return Math.round(frequency / (audioContext.sampleRate / analyser.fftSize / 2));
    }

    function getFreqFromIndex(index) {
        return index * (audioContext.sampleRate / analyser.fftSize / 2);
    }

    function onError() {
        alert("Unable to get Microphone input!");
    }

    function threePointQuadraticInterpolation(point1, point2, point3)
    {
        var x1 = point1.x;
        var x2 = point2.x;
        var x3 = point3.x;
        var y1 = point1.y;
        var y2 = point2.y;
        var y3 = point3.y;
        var denom = (x1 - x2) * (x1 - x3) * (x2 - x3);
        var A = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denom;
        var B = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / denom;
        var C = (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom;
        var vertex = new Point(-B / (2 * A), C - B * B / (4 * A));
        return vertex;
    }

    return {
        initStream: initStream,
        getStream: getStream,
        loopGuts: loopGuts,
        analysis: function() {
            return analysis;
        }
    };
});
muzTuner.service('MusicalNoteService', function() {

    this.getNoteNumber = function(noteString, octave) {
        var notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        var noteIndex = notes.indexOf(noteString.toUpperCase());
        return 12 * (octave) + noteIndex;
    },
            this.noteNumFromFrequency = function(frequency) {
                var noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
                return Math.round(noteNum) + 57;
            },
            this.frequencyFromNoteNumber = function(note) {
                return 440 * Math.pow(2, (note - 57) / 12);
            },
            this.centsOffFromPitch = function(frequency, note) {
                return (1200 * Math.log(frequency / this.frequencyFromNoteNumber(note)) / Math.log(2));
            };
});
muzTuner.controller('TunerController', function($scope, FrequencyAnalysisFactory, MusicalNoteService) {

    var inactiveColor = '#555555';
    var green = '#33ff66';
    var red = '#ff3333';
    $scope.bands = [];
    $scope.indicatorXPos = 12.0;
    $scope.analysis = FrequencyAnalysisFactory.analysis();
    $scope.flat = inactiveColor;
    $scope.sharp = inactiveColor;
    $scope.perfect = inactiveColor;
    $scope.notes = {
        fill: {
            A: inactiveColor,
            B: inactiveColor,
            C: inactiveColor,
            D: inactiveColor,
            E: inactiveColor,
            F: inactiveColor,
            G: inactiveColor,
            Sharp: inactiveColor
        },
        stroke: {
            A: inactiveColor,
            B: inactiveColor,
            C: inactiveColor,
            D: inactiveColor,
            E: inactiveColor,
            F: inactiveColor,
            G: inactiveColor,
            Sharp: inactiveColor
        }
    };

    FrequencyAnalysisFactory.initStream(
            function(stream) {
                FrequencyAnalysisFactory.getStream(stream);
                micLoop();
            });
    function micLoop() {
        $scope.flat = inactiveColor;
        $scope.sharp = inactiveColor;
        $scope.perfect = inactiveColor;
        $scope.notes = {
            fill: {
                A: inactiveColor,
                B: inactiveColor,
                C: inactiveColor,
                D: inactiveColor,
                E: inactiveColor,
                F: inactiveColor,
                G: inactiveColor,
                Sharp: inactiveColor
            },
            stroke: {
                A: inactiveColor,
                B: inactiveColor,
                C: inactiveColor,
                D: inactiveColor,
                E: inactiveColor,
                F: inactiveColor,
                G: inactiveColor,
                Sharp: inactiveColor
            }
        };
        FrequencyAnalysisFactory.loopGuts();
        var analysis = FrequencyAnalysisFactory.analysis();
        var noteNum = MusicalNoteService.noteNumFromFrequency(analysis.frequency);
        var note = getNoteFromNum(noteNum);

        if (note) {
            analysis.centsOff = MusicalNoteService.centsOffFromPitch(analysis.frequency, noteNum);
            $scope.notes.fill[note.charAt(0)] = red;
            $scope.notes.stroke[note.charAt(0)] = red;
            if (note.charAt(1) == '#') {
                $scope.notes.fill.Sharp = green;
                $scope.notes.stroke.Sharp = green;
            }
            if (Math.abs(analysis.centsOff) < 5) {
                $scope.perfect = green;
            } else if (analysis.centsOff < 0) {
                $scope.flat = red;
            } else {
                $scope.sharp = red;
            }

        }
        $scope.$apply();
        requestAnimationFrame(micLoop);
    }

    function getNoteFromNum(noteNum) {
        var notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        return notes[noteNum % 12];
    }


});