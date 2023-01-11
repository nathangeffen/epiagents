/*
  Generated using browsify from https://github.com/giannotr/runge-kutta-js.
  Thanks to Ruben Giannotti for making the above repo available under MIT license.
  This comment manually added by Nathan but the rest of the code is generated
  from Ruben's code using browsify.
*/

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
var rungeKutta = require('runge-kutta').default
global.window.rungeKutta = rungeKutta

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"runge-kutta":2}],2:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._scalarMult = function (scalar, vector) { return vector.map(function (x) { return scalar * x; }); };
exports._vectorAdd = function (a, b) { return a.map(function (x, i) { return x + b[i]; }); };
exports.UndependentVariableError = new Error('The destination of the undependent variable has to be greater than its start');
exports.StepSizeDivisibilityError = new Error('The range has to be an divisible by the step size');
function default_1(ODE, initialCondition, range, stepSize) {
    if (stepSize === void 0) { stepSize = 1; }
    var t0 = range[0], tn = range[1];
    var _return;
    if (tn > t0) {
        var steps = (tn - t0) / stepSize;
        var args = {
            equation: ODE,
            start: t0,
            stepSize: stepSize,
            steps: steps,
        };
        if (Number.isInteger(steps)) {
            if (typeof initialCondition === 'object' && initialCondition.length > 1) {
                _return = rungeKuttaMulti(__assign(__assign({}, args), { initialCondition: initialCondition }));
            }
            else {
                var _initialCondition = void 0;
                if (typeof initialCondition === 'object') {
                    _initialCondition = initialCondition[0];
                }
                else {
                    _initialCondition = initialCondition;
                }
                _return = rungeKutta1d(__assign(__assign({}, args), { initialCondition: _initialCondition }));
            }
            return _return;
        }
        throw exports.StepSizeDivisibilityError;
    }
    throw exports.UndependentVariableError;
}
exports.default = default_1;
var rungeKutta1d = function (args) {
    var equation = args.equation, initialCondition = args.initialCondition, start = args.start, stepSize = args.stepSize, steps = args.steps;
    var f = equation;
    var n = steps;
    var h = stepSize;
    var y = __spreadArrays([initialCondition], new Array(n).fill(0));
    var t = start;
    var i = 0;
    var k1, k2, k3, k4;
    while (i < n) {
        k1 = f(t, y[i]);
        k2 = f(t + (.5 * h), y[i] + (.5 * h * k1));
        k3 = f(t + (.5 * h), y[i] + (.5 * h * k2));
        k4 = f(t + h, y[i] + (h * k3));
        y[i + 1] = y[i] + (h * (k1 + (2 * k2) + (2 * k3) + k4) / 6);
        t += h;
        i++;
    }
    return y;
};
var rungeKuttaMulti = function (args) {
    var equation = args.equation, initialCondition = args.initialCondition, start = args.start, stepSize = args.stepSize, steps = args.steps;
    var f = equation;
    var n = steps;
    var h = stepSize;
    var y = [initialCondition];
    var m = initialCondition.length;
    var t = start;
    var i = 0;
    var k1, k2, k3, k4;
    while (i < n) {
        var yNext = [];
        k1 = f(t, y[i]);
        k2 = f(t + (.5 * h), exports._vectorAdd(y[i], exports._scalarMult(.5 * h, k1)));
        k3 = f(t + (.5 * h), exports._vectorAdd(y[i], exports._scalarMult(.5 * h, k2)));
        k4 = f(t + h, exports._vectorAdd(y[i], exports._scalarMult(h, k3)));
        for (var k = 0; k < m; k++) {
            yNext.push(y[i][k] + (h * (k1[k] + (2 * k2[k]) + (2 * k3[k]) + k4[k]) / 6));
        }
        y.push(yNext);
        t += h;
        i++;
    }
    return y;
};

},{}]},{},[1]);
