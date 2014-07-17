Muzishuss Tuner
----------------
Description: An angularjs guitar tuner module inspired by the built-in Ibanez acoustic/electric tuner. It utilizes the web audio api. <b>Only works in Firefox for now, since I have plans to create an FF add-on</b>
#### The algorithm I'm using to determine pitch is rough but quick:
1. Take the maximum of the web audio analyserNode's frequency domain to find the frequency bin with the highest amplitude
2. Use Quadratic Interpolation to estimate the frequency.
