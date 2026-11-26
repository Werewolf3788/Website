(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function n(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(i){if(i.ep)return;i.ep=!0;const s=n(i);fetch(i.href,s)}})();var Zw={exports:{}},Rc={},eE={exports:{}},re={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var za=Symbol.for("react.element"),Jk=Symbol.for("react.portal"),Zk=Symbol.for("react.fragment"),eR=Symbol.for("react.strict_mode"),tR=Symbol.for("react.profiler"),nR=Symbol.for("react.provider"),rR=Symbol.for("react.context"),iR=Symbol.for("react.forward_ref"),sR=Symbol.for("react.suspense"),oR=Symbol.for("react.memo"),aR=Symbol.for("react.lazy"),$_=Symbol.iterator;function lR(t){return t===null||typeof t!="object"?null:(t=$_&&t[$_]||t["@@iterator"],typeof t=="function"?t:null)}var tE={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},nE=Object.assign,rE={};function $s(t,e,n){this.props=t,this.context=e,this.refs=rE,this.updater=n||tE}$s.prototype.isReactComponent={};$s.prototype.setState=function(t,e){if(typeof t!="object"&&typeof t!="function"&&t!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,t,e,"setState")};$s.prototype.forceUpdate=function(t){this.updater.enqueueForceUpdate(this,t,"forceUpdate")};function iE(){}iE.prototype=$s.prototype;function pp(t,e,n){this.props=t,this.context=e,this.refs=rE,this.updater=n||tE}var mp=pp.prototype=new iE;mp.constructor=pp;nE(mp,$s.prototype);mp.isPureReactComponent=!0;var B_=Array.isArray,sE=Object.prototype.hasOwnProperty,gp={current:null},oE={key:!0,ref:!0,__self:!0,__source:!0};function aE(t,e,n){var r,i={},s=null,o=null;if(e!=null)for(r in e.ref!==void 0&&(o=e.ref),e.key!==void 0&&(s=""+e.key),e)sE.call(e,r)&&!oE.hasOwnProperty(r)&&(i[r]=e[r]);var l=arguments.length-2;if(l===1)i.children=n;else if(1<l){for(var u=Array(l),c=0;c<l;c++)u[c]=arguments[c+2];i.children=u}if(t&&t.defaultProps)for(r in l=t.defaultProps,l)i[r]===void 0&&(i[r]=l[r]);return{$$typeof:za,type:t,key:s,ref:o,props:i,_owner:gp.current}}function uR(t,e){return{$$typeof:za,type:t.type,key:e,ref:t.ref,props:t.props,_owner:t._owner}}function _p(t){return typeof t=="object"&&t!==null&&t.$$typeof===za}function cR(t){var e={"=":"=0",":":"=2"};return"$"+t.replace(/[=:]/g,function(n){return e[n]})}var z_=/\/+/g;function Bh(t,e){return typeof t=="object"&&t!==null&&t.key!=null?cR(""+t.key):e.toString(36)}function tu(t,e,n,r,i){var s=typeof t;(s==="undefined"||s==="boolean")&&(t=null);var o=!1;if(t===null)o=!0;else switch(s){case"string":case"number":o=!0;break;case"object":switch(t.$$typeof){case za:case Jk:o=!0}}if(o)return o=t,i=i(o),t=r===""?"."+Bh(o,0):r,B_(i)?(n="",t!=null&&(n=t.replace(z_,"$&/")+"/"),tu(i,e,n,"",function(c){return c})):i!=null&&(_p(i)&&(i=uR(i,n+(!i.key||o&&o.key===i.key?"":(""+i.key).replace(z_,"$&/")+"/")+t)),e.push(i)),1;if(o=0,r=r===""?".":r+":",B_(t))for(var l=0;l<t.length;l++){s=t[l];var u=r+Bh(s,l);o+=tu(s,e,n,u,i)}else if(u=lR(t),typeof u=="function")for(t=u.call(t),l=0;!(s=t.next()).done;)s=s.value,u=r+Bh(s,l++),o+=tu(s,e,n,u,i);else if(s==="object")throw e=String(t),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.");return o}function xl(t,e,n){if(t==null)return t;var r=[],i=0;return tu(t,r,"","",function(s){return e.call(n,s,i++)}),r}function hR(t){if(t._status===-1){var e=t._result;e=e(),e.then(function(n){(t._status===0||t._status===-1)&&(t._status=1,t._result=n)},function(n){(t._status===0||t._status===-1)&&(t._status=2,t._result=n)}),t._status===-1&&(t._status=0,t._result=e)}if(t._status===1)return t._result.default;throw t._result}var kt={current:null},nu={transition:null},dR={ReactCurrentDispatcher:kt,ReactCurrentBatchConfig:nu,ReactCurrentOwner:gp};function lE(){throw Error("act(...) is not supported in production builds of React.")}re.Children={map:xl,forEach:function(t,e,n){xl(t,function(){e.apply(this,arguments)},n)},count:function(t){var e=0;return xl(t,function(){e++}),e},toArray:function(t){return xl(t,function(e){return e})||[]},only:function(t){if(!_p(t))throw Error("React.Children.only expected to receive a single React element child.");return t}};re.Component=$s;re.Fragment=Zk;re.Profiler=tR;re.PureComponent=pp;re.StrictMode=eR;re.Suspense=sR;re.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=dR;re.act=lE;re.cloneElement=function(t,e,n){if(t==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+t+".");var r=nE({},t.props),i=t.key,s=t.ref,o=t._owner;if(e!=null){if(e.ref!==void 0&&(s=e.ref,o=gp.current),e.key!==void 0&&(i=""+e.key),t.type&&t.type.defaultProps)var l=t.type.defaultProps;for(u in e)sE.call(e,u)&&!oE.hasOwnProperty(u)&&(r[u]=e[u]===void 0&&l!==void 0?l[u]:e[u])}var u=arguments.length-2;if(u===1)r.children=n;else if(1<u){l=Array(u);for(var c=0;c<u;c++)l[c]=arguments[c+2];r.children=l}return{$$typeof:za,type:t.type,key:i,ref:s,props:r,_owner:o}};re.createContext=function(t){return t={$$typeof:rR,_currentValue:t,_currentValue2:t,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},t.Provider={$$typeof:nR,_context:t},t.Consumer=t};re.createElement=aE;re.createFactory=function(t){var e=aE.bind(null,t);return e.type=t,e};re.createRef=function(){return{current:null}};re.forwardRef=function(t){return{$$typeof:iR,render:t}};re.isValidElement=_p;re.lazy=function(t){return{$$typeof:aR,_payload:{_status:-1,_result:t},_init:hR}};re.memo=function(t,e){return{$$typeof:oR,type:t,compare:e===void 0?null:e}};re.startTransition=function(t){var e=nu.transition;nu.transition={};try{t()}finally{nu.transition=e}};re.unstable_act=lE;re.useCallback=function(t,e){return kt.current.useCallback(t,e)};re.useContext=function(t){return kt.current.useContext(t)};re.useDebugValue=function(){};re.useDeferredValue=function(t){return kt.current.useDeferredValue(t)};re.useEffect=function(t,e){return kt.current.useEffect(t,e)};re.useId=function(){return kt.current.useId()};re.useImperativeHandle=function(t,e,n){return kt.current.useImperativeHandle(t,e,n)};re.useInsertionEffect=function(t,e){return kt.current.useInsertionEffect(t,e)};re.useLayoutEffect=function(t,e){return kt.current.useLayoutEffect(t,e)};re.useMemo=function(t,e){return kt.current.useMemo(t,e)};re.useReducer=function(t,e,n){return kt.current.useReducer(t,e,n)};re.useRef=function(t){return kt.current.useRef(t)};re.useState=function(t){return kt.current.useState(t)};re.useSyncExternalStore=function(t,e,n){return kt.current.useSyncExternalStore(t,e,n)};re.useTransition=function(){return kt.current.useTransition()};re.version="18.3.1";eE.exports=re;var ae=eE.exports;/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var fR=ae,pR=Symbol.for("react.element"),mR=Symbol.for("react.fragment"),gR=Object.prototype.hasOwnProperty,_R=fR.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,yR={key:!0,ref:!0,__self:!0,__source:!0};function uE(t,e,n){var r,i={},s=null,o=null;n!==void 0&&(s=""+n),e.key!==void 0&&(s=""+e.key),e.ref!==void 0&&(o=e.ref);for(r in e)gR.call(e,r)&&!yR.hasOwnProperty(r)&&(i[r]=e[r]);if(t&&t.defaultProps)for(r in e=t.defaultProps,e)i[r]===void 0&&(i[r]=e[r]);return{$$typeof:pR,type:t,key:s,ref:o,props:i,_owner:_R.current}}Rc.Fragment=mR;Rc.jsx=uE;Rc.jsxs=uE;Zw.exports=Rc;var g=Zw.exports,cE={exports:{}},Wt={},hE={exports:{}},dE={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(t){function e(B,Y){var ee=B.length;B.push(Y);e:for(;0<ee;){var Re=ee-1>>>1,me=B[Re];if(0<i(me,Y))B[Re]=Y,B[ee]=me,ee=Re;else break e}}function n(B){return B.length===0?null:B[0]}function r(B){if(B.length===0)return null;var Y=B[0],ee=B.pop();if(ee!==Y){B[0]=ee;e:for(var Re=0,me=B.length,Le=me>>>1;Re<Le;){var Mn=2*(Re+1)-1,On=B[Mn],Ln=Mn+1,Vn=B[Ln];if(0>i(On,ee))Ln<me&&0>i(Vn,On)?(B[Re]=Vn,B[Ln]=ee,Re=Ln):(B[Re]=On,B[Mn]=ee,Re=Mn);else if(Ln<me&&0>i(Vn,ee))B[Re]=Vn,B[Ln]=ee,Re=Ln;else break e}}return Y}function i(B,Y){var ee=B.sortIndex-Y.sortIndex;return ee!==0?ee:B.id-Y.id}if(typeof performance=="object"&&typeof performance.now=="function"){var s=performance;t.unstable_now=function(){return s.now()}}else{var o=Date,l=o.now();t.unstable_now=function(){return o.now()-l}}var u=[],c=[],d=1,p=null,m=3,E=!1,k=!1,x=!1,P=typeof setTimeout=="function"?setTimeout:null,S=typeof clearTimeout=="function"?clearTimeout:null,w=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function R(B){for(var Y=n(c);Y!==null;){if(Y.callback===null)r(c);else if(Y.startTime<=B)r(c),Y.sortIndex=Y.expirationTime,e(u,Y);else break;Y=n(c)}}function D(B){if(x=!1,R(B),!k)if(n(u)!==null)k=!0,Vt(j);else{var Y=n(c);Y!==null&&Dn(D,Y.startTime-B)}}function j(B,Y){k=!1,x&&(x=!1,S(y),y=-1),E=!0;var ee=m;try{for(R(Y),p=n(u);p!==null&&(!(p.expirationTime>Y)||B&&!A());){var Re=p.callback;if(typeof Re=="function"){p.callback=null,m=p.priorityLevel;var me=Re(p.expirationTime<=Y);Y=t.unstable_now(),typeof me=="function"?p.callback=me:p===n(u)&&r(u),R(Y)}else r(u);p=n(u)}if(p!==null)var Le=!0;else{var Mn=n(c);Mn!==null&&Dn(D,Mn.startTime-Y),Le=!1}return Le}finally{p=null,m=ee,E=!1}}var O=!1,T=null,y=-1,v=5,I=-1;function A(){return!(t.unstable_now()-I<v)}function N(){if(T!==null){var B=t.unstable_now();I=B;var Y=!0;try{Y=T(!0,B)}finally{Y?C():(O=!1,T=null)}}else O=!1}var C;if(typeof w=="function")C=function(){w(N)};else if(typeof MessageChannel<"u"){var At=new MessageChannel,bn=At.port2;At.port1.onmessage=N,C=function(){bn.postMessage(null)}}else C=function(){P(N,0)};function Vt(B){T=B,O||(O=!0,C())}function Dn(B,Y){y=P(function(){B(t.unstable_now())},Y)}t.unstable_IdlePriority=5,t.unstable_ImmediatePriority=1,t.unstable_LowPriority=4,t.unstable_NormalPriority=3,t.unstable_Profiling=null,t.unstable_UserBlockingPriority=2,t.unstable_cancelCallback=function(B){B.callback=null},t.unstable_continueExecution=function(){k||E||(k=!0,Vt(j))},t.unstable_forceFrameRate=function(B){0>B||125<B?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):v=0<B?Math.floor(1e3/B):5},t.unstable_getCurrentPriorityLevel=function(){return m},t.unstable_getFirstCallbackNode=function(){return n(u)},t.unstable_next=function(B){switch(m){case 1:case 2:case 3:var Y=3;break;default:Y=m}var ee=m;m=Y;try{return B()}finally{m=ee}},t.unstable_pauseExecution=function(){},t.unstable_requestPaint=function(){},t.unstable_runWithPriority=function(B,Y){switch(B){case 1:case 2:case 3:case 4:case 5:break;default:B=3}var ee=m;m=B;try{return Y()}finally{m=ee}},t.unstable_scheduleCallback=function(B,Y,ee){var Re=t.unstable_now();switch(typeof ee=="object"&&ee!==null?(ee=ee.delay,ee=typeof ee=="number"&&0<ee?Re+ee:Re):ee=Re,B){case 1:var me=-1;break;case 2:me=250;break;case 5:me=1073741823;break;case 4:me=1e4;break;default:me=5e3}return me=ee+me,B={id:d++,callback:Y,priorityLevel:B,startTime:ee,expirationTime:me,sortIndex:-1},ee>Re?(B.sortIndex=ee,e(c,B),n(u)===null&&B===n(c)&&(x?(S(y),y=-1):x=!0,Dn(D,ee-Re))):(B.sortIndex=me,e(u,B),k||E||(k=!0,Vt(j))),B},t.unstable_shouldYield=A,t.unstable_wrapCallback=function(B){var Y=m;return function(){var ee=m;m=Y;try{return B.apply(this,arguments)}finally{m=ee}}}})(dE);hE.exports=dE;var vR=hE.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var wR=ae,zt=vR;function F(t){for(var e="https://reactjs.org/docs/error-decoder.html?invariant="+t,n=1;n<arguments.length;n++)e+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+t+"; visit "+e+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var fE=new Set,sa={};function Di(t,e){ws(t,e),ws(t+"Capture",e)}function ws(t,e){for(sa[t]=e,t=0;t<e.length;t++)fE.add(e[t])}var Jn=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),Dd=Object.prototype.hasOwnProperty,ER=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,W_={},H_={};function TR(t){return Dd.call(H_,t)?!0:Dd.call(W_,t)?!1:ER.test(t)?H_[t]=!0:(W_[t]=!0,!1)}function IR(t,e,n,r){if(n!==null&&n.type===0)return!1;switch(typeof e){case"function":case"symbol":return!0;case"boolean":return r?!1:n!==null?!n.acceptsBooleans:(t=t.toLowerCase().slice(0,5),t!=="data-"&&t!=="aria-");default:return!1}}function SR(t,e,n,r){if(e===null||typeof e>"u"||IR(t,e,n,r))return!0;if(r)return!1;if(n!==null)switch(n.type){case 3:return!e;case 4:return e===!1;case 5:return isNaN(e);case 6:return isNaN(e)||1>e}return!1}function Rt(t,e,n,r,i,s,o){this.acceptsBooleans=e===2||e===3||e===4,this.attributeName=r,this.attributeNamespace=i,this.mustUseProperty=n,this.propertyName=t,this.type=e,this.sanitizeURL=s,this.removeEmptyString=o}var st={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t){st[t]=new Rt(t,0,!1,t,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(t){var e=t[0];st[e]=new Rt(e,1,!1,t[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(t){st[t]=new Rt(t,2,!1,t.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(t){st[t]=new Rt(t,2,!1,t,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t){st[t]=new Rt(t,3,!1,t.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(t){st[t]=new Rt(t,3,!0,t,null,!1,!1)});["capture","download"].forEach(function(t){st[t]=new Rt(t,4,!1,t,null,!1,!1)});["cols","rows","size","span"].forEach(function(t){st[t]=new Rt(t,6,!1,t,null,!1,!1)});["rowSpan","start"].forEach(function(t){st[t]=new Rt(t,5,!1,t.toLowerCase(),null,!1,!1)});var yp=/[\-:]([a-z])/g;function vp(t){return t[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t){var e=t.replace(yp,vp);st[e]=new Rt(e,1,!1,t,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t){var e=t.replace(yp,vp);st[e]=new Rt(e,1,!1,t,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(t){var e=t.replace(yp,vp);st[e]=new Rt(e,1,!1,t,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(t){st[t]=new Rt(t,1,!1,t.toLowerCase(),null,!1,!1)});st.xlinkHref=new Rt("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(t){st[t]=new Rt(t,1,!1,t.toLowerCase(),null,!0,!0)});function wp(t,e,n,r){var i=st.hasOwnProperty(e)?st[e]:null;(i!==null?i.type!==0:r||!(2<e.length)||e[0]!=="o"&&e[0]!=="O"||e[1]!=="n"&&e[1]!=="N")&&(SR(e,n,i,r)&&(n=null),r||i===null?TR(e)&&(n===null?t.removeAttribute(e):t.setAttribute(e,""+n)):i.mustUseProperty?t[i.propertyName]=n===null?i.type===3?!1:"":n:(e=i.attributeName,r=i.attributeNamespace,n===null?t.removeAttribute(e):(i=i.type,n=i===3||i===4&&n===!0?"":""+n,r?t.setAttributeNS(r,e,n):t.setAttribute(e,n))))}var lr=wR.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,bl=Symbol.for("react.element"),Ki=Symbol.for("react.portal"),Qi=Symbol.for("react.fragment"),Ep=Symbol.for("react.strict_mode"),Md=Symbol.for("react.profiler"),pE=Symbol.for("react.provider"),mE=Symbol.for("react.context"),Tp=Symbol.for("react.forward_ref"),Od=Symbol.for("react.suspense"),Ld=Symbol.for("react.suspense_list"),Ip=Symbol.for("react.memo"),_r=Symbol.for("react.lazy"),gE=Symbol.for("react.offscreen"),q_=Symbol.iterator;function go(t){return t===null||typeof t!="object"?null:(t=q_&&t[q_]||t["@@iterator"],typeof t=="function"?t:null)}var Pe=Object.assign,zh;function No(t){if(zh===void 0)try{throw Error()}catch(n){var e=n.stack.trim().match(/\n( *(at )?)/);zh=e&&e[1]||""}return`
`+zh+t}var Wh=!1;function Hh(t,e){if(!t||Wh)return"";Wh=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(e)if(e=function(){throw Error()},Object.defineProperty(e.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(e,[])}catch(c){var r=c}Reflect.construct(t,[],e)}else{try{e.call()}catch(c){r=c}t.call(e.prototype)}else{try{throw Error()}catch(c){r=c}t()}}catch(c){if(c&&r&&typeof c.stack=="string"){for(var i=c.stack.split(`
`),s=r.stack.split(`
`),o=i.length-1,l=s.length-1;1<=o&&0<=l&&i[o]!==s[l];)l--;for(;1<=o&&0<=l;o--,l--)if(i[o]!==s[l]){if(o!==1||l!==1)do if(o--,l--,0>l||i[o]!==s[l]){var u=`
`+i[o].replace(" at new "," at ");return t.displayName&&u.includes("<anonymous>")&&(u=u.replace("<anonymous>",t.displayName)),u}while(1<=o&&0<=l);break}}}finally{Wh=!1,Error.prepareStackTrace=n}return(t=t?t.displayName||t.name:"")?No(t):""}function CR(t){switch(t.tag){case 5:return No(t.type);case 16:return No("Lazy");case 13:return No("Suspense");case 19:return No("SuspenseList");case 0:case 2:case 15:return t=Hh(t.type,!1),t;case 11:return t=Hh(t.type.render,!1),t;case 1:return t=Hh(t.type,!0),t;default:return""}}function Vd(t){if(t==null)return null;if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t;switch(t){case Qi:return"Fragment";case Ki:return"Portal";case Md:return"Profiler";case Ep:return"StrictMode";case Od:return"Suspense";case Ld:return"SuspenseList"}if(typeof t=="object")switch(t.$$typeof){case mE:return(t.displayName||"Context")+".Consumer";case pE:return(t._context.displayName||"Context")+".Provider";case Tp:var e=t.render;return t=t.displayName,t||(t=e.displayName||e.name||"",t=t!==""?"ForwardRef("+t+")":"ForwardRef"),t;case Ip:return e=t.displayName||null,e!==null?e:Vd(t.type)||"Memo";case _r:e=t._payload,t=t._init;try{return Vd(t(e))}catch{}}return null}function kR(t){var e=t.type;switch(t.tag){case 24:return"Cache";case 9:return(e.displayName||"Context")+".Consumer";case 10:return(e._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return t=e.render,t=t.displayName||t.name||"",e.displayName||(t!==""?"ForwardRef("+t+")":"ForwardRef");case 7:return"Fragment";case 5:return e;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return Vd(e);case 8:return e===Ep?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e}return null}function $r(t){switch(typeof t){case"boolean":case"number":case"string":case"undefined":return t;case"object":return t;default:return""}}function _E(t){var e=t.type;return(t=t.nodeName)&&t.toLowerCase()==="input"&&(e==="checkbox"||e==="radio")}function RR(t){var e=_E(t)?"checked":"value",n=Object.getOwnPropertyDescriptor(t.constructor.prototype,e),r=""+t[e];if(!t.hasOwnProperty(e)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var i=n.get,s=n.set;return Object.defineProperty(t,e,{configurable:!0,get:function(){return i.call(this)},set:function(o){r=""+o,s.call(this,o)}}),Object.defineProperty(t,e,{enumerable:n.enumerable}),{getValue:function(){return r},setValue:function(o){r=""+o},stopTracking:function(){t._valueTracker=null,delete t[e]}}}}function Dl(t){t._valueTracker||(t._valueTracker=RR(t))}function yE(t){if(!t)return!1;var e=t._valueTracker;if(!e)return!0;var n=e.getValue(),r="";return t&&(r=_E(t)?t.checked?"true":"false":t.value),t=r,t!==n?(e.setValue(t),!0):!1}function Su(t){if(t=t||(typeof document<"u"?document:void 0),typeof t>"u")return null;try{return t.activeElement||t.body}catch{return t.body}}function Fd(t,e){var n=e.checked;return Pe({},e,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??t._wrapperState.initialChecked})}function G_(t,e){var n=e.defaultValue==null?"":e.defaultValue,r=e.checked!=null?e.checked:e.defaultChecked;n=$r(e.value!=null?e.value:n),t._wrapperState={initialChecked:r,initialValue:n,controlled:e.type==="checkbox"||e.type==="radio"?e.checked!=null:e.value!=null}}function vE(t,e){e=e.checked,e!=null&&wp(t,"checked",e,!1)}function jd(t,e){vE(t,e);var n=$r(e.value),r=e.type;if(n!=null)r==="number"?(n===0&&t.value===""||t.value!=n)&&(t.value=""+n):t.value!==""+n&&(t.value=""+n);else if(r==="submit"||r==="reset"){t.removeAttribute("value");return}e.hasOwnProperty("value")?Ud(t,e.type,n):e.hasOwnProperty("defaultValue")&&Ud(t,e.type,$r(e.defaultValue)),e.checked==null&&e.defaultChecked!=null&&(t.defaultChecked=!!e.defaultChecked)}function K_(t,e,n){if(e.hasOwnProperty("value")||e.hasOwnProperty("defaultValue")){var r=e.type;if(!(r!=="submit"&&r!=="reset"||e.value!==void 0&&e.value!==null))return;e=""+t._wrapperState.initialValue,n||e===t.value||(t.value=e),t.defaultValue=e}n=t.name,n!==""&&(t.name=""),t.defaultChecked=!!t._wrapperState.initialChecked,n!==""&&(t.name=n)}function Ud(t,e,n){(e!=="number"||Su(t.ownerDocument)!==t)&&(n==null?t.defaultValue=""+t._wrapperState.initialValue:t.defaultValue!==""+n&&(t.defaultValue=""+n))}var Po=Array.isArray;function as(t,e,n,r){if(t=t.options,e){e={};for(var i=0;i<n.length;i++)e["$"+n[i]]=!0;for(n=0;n<t.length;n++)i=e.hasOwnProperty("$"+t[n].value),t[n].selected!==i&&(t[n].selected=i),i&&r&&(t[n].defaultSelected=!0)}else{for(n=""+$r(n),e=null,i=0;i<t.length;i++){if(t[i].value===n){t[i].selected=!0,r&&(t[i].defaultSelected=!0);return}e!==null||t[i].disabled||(e=t[i])}e!==null&&(e.selected=!0)}}function $d(t,e){if(e.dangerouslySetInnerHTML!=null)throw Error(F(91));return Pe({},e,{value:void 0,defaultValue:void 0,children:""+t._wrapperState.initialValue})}function Q_(t,e){var n=e.value;if(n==null){if(n=e.children,e=e.defaultValue,n!=null){if(e!=null)throw Error(F(92));if(Po(n)){if(1<n.length)throw Error(F(93));n=n[0]}e=n}e==null&&(e=""),n=e}t._wrapperState={initialValue:$r(n)}}function wE(t,e){var n=$r(e.value),r=$r(e.defaultValue);n!=null&&(n=""+n,n!==t.value&&(t.value=n),e.defaultValue==null&&t.defaultValue!==n&&(t.defaultValue=n)),r!=null&&(t.defaultValue=""+r)}function Y_(t){var e=t.textContent;e===t._wrapperState.initialValue&&e!==""&&e!==null&&(t.value=e)}function EE(t){switch(t){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function Bd(t,e){return t==null||t==="http://www.w3.org/1999/xhtml"?EE(e):t==="http://www.w3.org/2000/svg"&&e==="foreignObject"?"http://www.w3.org/1999/xhtml":t}var Ml,TE=function(t){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(e,n,r,i){MSApp.execUnsafeLocalFunction(function(){return t(e,n,r,i)})}:t}(function(t,e){if(t.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in t)t.innerHTML=e;else{for(Ml=Ml||document.createElement("div"),Ml.innerHTML="<svg>"+e.valueOf().toString()+"</svg>",e=Ml.firstChild;t.firstChild;)t.removeChild(t.firstChild);for(;e.firstChild;)t.appendChild(e.firstChild)}});function oa(t,e){if(e){var n=t.firstChild;if(n&&n===t.lastChild&&n.nodeType===3){n.nodeValue=e;return}}t.textContent=e}var Vo={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},AR=["Webkit","ms","Moz","O"];Object.keys(Vo).forEach(function(t){AR.forEach(function(e){e=e+t.charAt(0).toUpperCase()+t.substring(1),Vo[e]=Vo[t]})});function IE(t,e,n){return e==null||typeof e=="boolean"||e===""?"":n||typeof e!="number"||e===0||Vo.hasOwnProperty(t)&&Vo[t]?(""+e).trim():e+"px"}function SE(t,e){t=t.style;for(var n in e)if(e.hasOwnProperty(n)){var r=n.indexOf("--")===0,i=IE(n,e[n],r);n==="float"&&(n="cssFloat"),r?t.setProperty(n,i):t[n]=i}}var NR=Pe({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function zd(t,e){if(e){if(NR[t]&&(e.children!=null||e.dangerouslySetInnerHTML!=null))throw Error(F(137,t));if(e.dangerouslySetInnerHTML!=null){if(e.children!=null)throw Error(F(60));if(typeof e.dangerouslySetInnerHTML!="object"||!("__html"in e.dangerouslySetInnerHTML))throw Error(F(61))}if(e.style!=null&&typeof e.style!="object")throw Error(F(62))}}function Wd(t,e){if(t.indexOf("-")===-1)return typeof e.is=="string";switch(t){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Hd=null;function Sp(t){return t=t.target||t.srcElement||window,t.correspondingUseElement&&(t=t.correspondingUseElement),t.nodeType===3?t.parentNode:t}var qd=null,ls=null,us=null;function X_(t){if(t=qa(t)){if(typeof qd!="function")throw Error(F(280));var e=t.stateNode;e&&(e=bc(e),qd(t.stateNode,t.type,e))}}function CE(t){ls?us?us.push(t):us=[t]:ls=t}function kE(){if(ls){var t=ls,e=us;if(us=ls=null,X_(t),e)for(t=0;t<e.length;t++)X_(e[t])}}function RE(t,e){return t(e)}function AE(){}var qh=!1;function NE(t,e,n){if(qh)return t(e,n);qh=!0;try{return RE(t,e,n)}finally{qh=!1,(ls!==null||us!==null)&&(AE(),kE())}}function aa(t,e){var n=t.stateNode;if(n===null)return null;var r=bc(n);if(r===null)return null;n=r[e];e:switch(e){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(r=!r.disabled)||(t=t.type,r=!(t==="button"||t==="input"||t==="select"||t==="textarea")),t=!r;break e;default:t=!1}if(t)return null;if(n&&typeof n!="function")throw Error(F(231,e,typeof n));return n}var Gd=!1;if(Jn)try{var _o={};Object.defineProperty(_o,"passive",{get:function(){Gd=!0}}),window.addEventListener("test",_o,_o),window.removeEventListener("test",_o,_o)}catch{Gd=!1}function PR(t,e,n,r,i,s,o,l,u){var c=Array.prototype.slice.call(arguments,3);try{e.apply(n,c)}catch(d){this.onError(d)}}var Fo=!1,Cu=null,ku=!1,Kd=null,xR={onError:function(t){Fo=!0,Cu=t}};function bR(t,e,n,r,i,s,o,l,u){Fo=!1,Cu=null,PR.apply(xR,arguments)}function DR(t,e,n,r,i,s,o,l,u){if(bR.apply(this,arguments),Fo){if(Fo){var c=Cu;Fo=!1,Cu=null}else throw Error(F(198));ku||(ku=!0,Kd=c)}}function Mi(t){var e=t,n=t;if(t.alternate)for(;e.return;)e=e.return;else{t=e;do e=t,e.flags&4098&&(n=e.return),t=e.return;while(t)}return e.tag===3?n:null}function PE(t){if(t.tag===13){var e=t.memoizedState;if(e===null&&(t=t.alternate,t!==null&&(e=t.memoizedState)),e!==null)return e.dehydrated}return null}function J_(t){if(Mi(t)!==t)throw Error(F(188))}function MR(t){var e=t.alternate;if(!e){if(e=Mi(t),e===null)throw Error(F(188));return e!==t?null:t}for(var n=t,r=e;;){var i=n.return;if(i===null)break;var s=i.alternate;if(s===null){if(r=i.return,r!==null){n=r;continue}break}if(i.child===s.child){for(s=i.child;s;){if(s===n)return J_(i),t;if(s===r)return J_(i),e;s=s.sibling}throw Error(F(188))}if(n.return!==r.return)n=i,r=s;else{for(var o=!1,l=i.child;l;){if(l===n){o=!0,n=i,r=s;break}if(l===r){o=!0,r=i,n=s;break}l=l.sibling}if(!o){for(l=s.child;l;){if(l===n){o=!0,n=s,r=i;break}if(l===r){o=!0,r=s,n=i;break}l=l.sibling}if(!o)throw Error(F(189))}}if(n.alternate!==r)throw Error(F(190))}if(n.tag!==3)throw Error(F(188));return n.stateNode.current===n?t:e}function xE(t){return t=MR(t),t!==null?bE(t):null}function bE(t){if(t.tag===5||t.tag===6)return t;for(t=t.child;t!==null;){var e=bE(t);if(e!==null)return e;t=t.sibling}return null}var DE=zt.unstable_scheduleCallback,Z_=zt.unstable_cancelCallback,OR=zt.unstable_shouldYield,LR=zt.unstable_requestPaint,Fe=zt.unstable_now,VR=zt.unstable_getCurrentPriorityLevel,Cp=zt.unstable_ImmediatePriority,ME=zt.unstable_UserBlockingPriority,Ru=zt.unstable_NormalPriority,FR=zt.unstable_LowPriority,OE=zt.unstable_IdlePriority,Ac=null,Tn=null;function jR(t){if(Tn&&typeof Tn.onCommitFiberRoot=="function")try{Tn.onCommitFiberRoot(Ac,t,void 0,(t.current.flags&128)===128)}catch{}}var cn=Math.clz32?Math.clz32:BR,UR=Math.log,$R=Math.LN2;function BR(t){return t>>>=0,t===0?32:31-(UR(t)/$R|0)|0}var Ol=64,Ll=4194304;function xo(t){switch(t&-t){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return t&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return t}}function Au(t,e){var n=t.pendingLanes;if(n===0)return 0;var r=0,i=t.suspendedLanes,s=t.pingedLanes,o=n&268435455;if(o!==0){var l=o&~i;l!==0?r=xo(l):(s&=o,s!==0&&(r=xo(s)))}else o=n&~i,o!==0?r=xo(o):s!==0&&(r=xo(s));if(r===0)return 0;if(e!==0&&e!==r&&!(e&i)&&(i=r&-r,s=e&-e,i>=s||i===16&&(s&4194240)!==0))return e;if(r&4&&(r|=n&16),e=t.entangledLanes,e!==0)for(t=t.entanglements,e&=r;0<e;)n=31-cn(e),i=1<<n,r|=t[n],e&=~i;return r}function zR(t,e){switch(t){case 1:case 2:case 4:return e+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function WR(t,e){for(var n=t.suspendedLanes,r=t.pingedLanes,i=t.expirationTimes,s=t.pendingLanes;0<s;){var o=31-cn(s),l=1<<o,u=i[o];u===-1?(!(l&n)||l&r)&&(i[o]=zR(l,e)):u<=e&&(t.expiredLanes|=l),s&=~l}}function Qd(t){return t=t.pendingLanes&-1073741825,t!==0?t:t&1073741824?1073741824:0}function LE(){var t=Ol;return Ol<<=1,!(Ol&4194240)&&(Ol=64),t}function Gh(t){for(var e=[],n=0;31>n;n++)e.push(t);return e}function Wa(t,e,n){t.pendingLanes|=e,e!==536870912&&(t.suspendedLanes=0,t.pingedLanes=0),t=t.eventTimes,e=31-cn(e),t[e]=n}function HR(t,e){var n=t.pendingLanes&~e;t.pendingLanes=e,t.suspendedLanes=0,t.pingedLanes=0,t.expiredLanes&=e,t.mutableReadLanes&=e,t.entangledLanes&=e,e=t.entanglements;var r=t.eventTimes;for(t=t.expirationTimes;0<n;){var i=31-cn(n),s=1<<i;e[i]=0,r[i]=-1,t[i]=-1,n&=~s}}function kp(t,e){var n=t.entangledLanes|=e;for(t=t.entanglements;n;){var r=31-cn(n),i=1<<r;i&e|t[r]&e&&(t[r]|=e),n&=~i}}var fe=0;function VE(t){return t&=-t,1<t?4<t?t&268435455?16:536870912:4:1}var FE,Rp,jE,UE,$E,Yd=!1,Vl=[],Rr=null,Ar=null,Nr=null,la=new Map,ua=new Map,vr=[],qR="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function ey(t,e){switch(t){case"focusin":case"focusout":Rr=null;break;case"dragenter":case"dragleave":Ar=null;break;case"mouseover":case"mouseout":Nr=null;break;case"pointerover":case"pointerout":la.delete(e.pointerId);break;case"gotpointercapture":case"lostpointercapture":ua.delete(e.pointerId)}}function yo(t,e,n,r,i,s){return t===null||t.nativeEvent!==s?(t={blockedOn:e,domEventName:n,eventSystemFlags:r,nativeEvent:s,targetContainers:[i]},e!==null&&(e=qa(e),e!==null&&Rp(e)),t):(t.eventSystemFlags|=r,e=t.targetContainers,i!==null&&e.indexOf(i)===-1&&e.push(i),t)}function GR(t,e,n,r,i){switch(e){case"focusin":return Rr=yo(Rr,t,e,n,r,i),!0;case"dragenter":return Ar=yo(Ar,t,e,n,r,i),!0;case"mouseover":return Nr=yo(Nr,t,e,n,r,i),!0;case"pointerover":var s=i.pointerId;return la.set(s,yo(la.get(s)||null,t,e,n,r,i)),!0;case"gotpointercapture":return s=i.pointerId,ua.set(s,yo(ua.get(s)||null,t,e,n,r,i)),!0}return!1}function BE(t){var e=li(t.target);if(e!==null){var n=Mi(e);if(n!==null){if(e=n.tag,e===13){if(e=PE(n),e!==null){t.blockedOn=e,$E(t.priority,function(){jE(n)});return}}else if(e===3&&n.stateNode.current.memoizedState.isDehydrated){t.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}t.blockedOn=null}function ru(t){if(t.blockedOn!==null)return!1;for(var e=t.targetContainers;0<e.length;){var n=Xd(t.domEventName,t.eventSystemFlags,e[0],t.nativeEvent);if(n===null){n=t.nativeEvent;var r=new n.constructor(n.type,n);Hd=r,n.target.dispatchEvent(r),Hd=null}else return e=qa(n),e!==null&&Rp(e),t.blockedOn=n,!1;e.shift()}return!0}function ty(t,e,n){ru(t)&&n.delete(e)}function KR(){Yd=!1,Rr!==null&&ru(Rr)&&(Rr=null),Ar!==null&&ru(Ar)&&(Ar=null),Nr!==null&&ru(Nr)&&(Nr=null),la.forEach(ty),ua.forEach(ty)}function vo(t,e){t.blockedOn===e&&(t.blockedOn=null,Yd||(Yd=!0,zt.unstable_scheduleCallback(zt.unstable_NormalPriority,KR)))}function ca(t){function e(i){return vo(i,t)}if(0<Vl.length){vo(Vl[0],t);for(var n=1;n<Vl.length;n++){var r=Vl[n];r.blockedOn===t&&(r.blockedOn=null)}}for(Rr!==null&&vo(Rr,t),Ar!==null&&vo(Ar,t),Nr!==null&&vo(Nr,t),la.forEach(e),ua.forEach(e),n=0;n<vr.length;n++)r=vr[n],r.blockedOn===t&&(r.blockedOn=null);for(;0<vr.length&&(n=vr[0],n.blockedOn===null);)BE(n),n.blockedOn===null&&vr.shift()}var cs=lr.ReactCurrentBatchConfig,Nu=!0;function QR(t,e,n,r){var i=fe,s=cs.transition;cs.transition=null;try{fe=1,Ap(t,e,n,r)}finally{fe=i,cs.transition=s}}function YR(t,e,n,r){var i=fe,s=cs.transition;cs.transition=null;try{fe=4,Ap(t,e,n,r)}finally{fe=i,cs.transition=s}}function Ap(t,e,n,r){if(Nu){var i=Xd(t,e,n,r);if(i===null)rd(t,e,r,Pu,n),ey(t,r);else if(GR(i,t,e,n,r))r.stopPropagation();else if(ey(t,r),e&4&&-1<qR.indexOf(t)){for(;i!==null;){var s=qa(i);if(s!==null&&FE(s),s=Xd(t,e,n,r),s===null&&rd(t,e,r,Pu,n),s===i)break;i=s}i!==null&&r.stopPropagation()}else rd(t,e,r,null,n)}}var Pu=null;function Xd(t,e,n,r){if(Pu=null,t=Sp(r),t=li(t),t!==null)if(e=Mi(t),e===null)t=null;else if(n=e.tag,n===13){if(t=PE(e),t!==null)return t;t=null}else if(n===3){if(e.stateNode.current.memoizedState.isDehydrated)return e.tag===3?e.stateNode.containerInfo:null;t=null}else e!==t&&(t=null);return Pu=t,null}function zE(t){switch(t){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(VR()){case Cp:return 1;case ME:return 4;case Ru:case FR:return 16;case OE:return 536870912;default:return 16}default:return 16}}var Sr=null,Np=null,iu=null;function WE(){if(iu)return iu;var t,e=Np,n=e.length,r,i="value"in Sr?Sr.value:Sr.textContent,s=i.length;for(t=0;t<n&&e[t]===i[t];t++);var o=n-t;for(r=1;r<=o&&e[n-r]===i[s-r];r++);return iu=i.slice(t,1<r?1-r:void 0)}function su(t){var e=t.keyCode;return"charCode"in t?(t=t.charCode,t===0&&e===13&&(t=13)):t=e,t===10&&(t=13),32<=t||t===13?t:0}function Fl(){return!0}function ny(){return!1}function Ht(t){function e(n,r,i,s,o){this._reactName=n,this._targetInst=i,this.type=r,this.nativeEvent=s,this.target=o,this.currentTarget=null;for(var l in t)t.hasOwnProperty(l)&&(n=t[l],this[l]=n?n(s):s[l]);return this.isDefaultPrevented=(s.defaultPrevented!=null?s.defaultPrevented:s.returnValue===!1)?Fl:ny,this.isPropagationStopped=ny,this}return Pe(e.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=Fl)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=Fl)},persist:function(){},isPersistent:Fl}),e}var Bs={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(t){return t.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Pp=Ht(Bs),Ha=Pe({},Bs,{view:0,detail:0}),XR=Ht(Ha),Kh,Qh,wo,Nc=Pe({},Ha,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:xp,button:0,buttons:0,relatedTarget:function(t){return t.relatedTarget===void 0?t.fromElement===t.srcElement?t.toElement:t.fromElement:t.relatedTarget},movementX:function(t){return"movementX"in t?t.movementX:(t!==wo&&(wo&&t.type==="mousemove"?(Kh=t.screenX-wo.screenX,Qh=t.screenY-wo.screenY):Qh=Kh=0,wo=t),Kh)},movementY:function(t){return"movementY"in t?t.movementY:Qh}}),ry=Ht(Nc),JR=Pe({},Nc,{dataTransfer:0}),ZR=Ht(JR),eA=Pe({},Ha,{relatedTarget:0}),Yh=Ht(eA),tA=Pe({},Bs,{animationName:0,elapsedTime:0,pseudoElement:0}),nA=Ht(tA),rA=Pe({},Bs,{clipboardData:function(t){return"clipboardData"in t?t.clipboardData:window.clipboardData}}),iA=Ht(rA),sA=Pe({},Bs,{data:0}),iy=Ht(sA),oA={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},aA={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},lA={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function uA(t){var e=this.nativeEvent;return e.getModifierState?e.getModifierState(t):(t=lA[t])?!!e[t]:!1}function xp(){return uA}var cA=Pe({},Ha,{key:function(t){if(t.key){var e=oA[t.key]||t.key;if(e!=="Unidentified")return e}return t.type==="keypress"?(t=su(t),t===13?"Enter":String.fromCharCode(t)):t.type==="keydown"||t.type==="keyup"?aA[t.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:xp,charCode:function(t){return t.type==="keypress"?su(t):0},keyCode:function(t){return t.type==="keydown"||t.type==="keyup"?t.keyCode:0},which:function(t){return t.type==="keypress"?su(t):t.type==="keydown"||t.type==="keyup"?t.keyCode:0}}),hA=Ht(cA),dA=Pe({},Nc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),sy=Ht(dA),fA=Pe({},Ha,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:xp}),pA=Ht(fA),mA=Pe({},Bs,{propertyName:0,elapsedTime:0,pseudoElement:0}),gA=Ht(mA),_A=Pe({},Nc,{deltaX:function(t){return"deltaX"in t?t.deltaX:"wheelDeltaX"in t?-t.wheelDeltaX:0},deltaY:function(t){return"deltaY"in t?t.deltaY:"wheelDeltaY"in t?-t.wheelDeltaY:"wheelDelta"in t?-t.wheelDelta:0},deltaZ:0,deltaMode:0}),yA=Ht(_A),vA=[9,13,27,32],bp=Jn&&"CompositionEvent"in window,jo=null;Jn&&"documentMode"in document&&(jo=document.documentMode);var wA=Jn&&"TextEvent"in window&&!jo,HE=Jn&&(!bp||jo&&8<jo&&11>=jo),oy=" ",ay=!1;function qE(t,e){switch(t){case"keyup":return vA.indexOf(e.keyCode)!==-1;case"keydown":return e.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function GE(t){return t=t.detail,typeof t=="object"&&"data"in t?t.data:null}var Yi=!1;function EA(t,e){switch(t){case"compositionend":return GE(e);case"keypress":return e.which!==32?null:(ay=!0,oy);case"textInput":return t=e.data,t===oy&&ay?null:t;default:return null}}function TA(t,e){if(Yi)return t==="compositionend"||!bp&&qE(t,e)?(t=WE(),iu=Np=Sr=null,Yi=!1,t):null;switch(t){case"paste":return null;case"keypress":if(!(e.ctrlKey||e.altKey||e.metaKey)||e.ctrlKey&&e.altKey){if(e.char&&1<e.char.length)return e.char;if(e.which)return String.fromCharCode(e.which)}return null;case"compositionend":return HE&&e.locale!=="ko"?null:e.data;default:return null}}var IA={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function ly(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e==="input"?!!IA[t.type]:e==="textarea"}function KE(t,e,n,r){CE(r),e=xu(e,"onChange"),0<e.length&&(n=new Pp("onChange","change",null,n,r),t.push({event:n,listeners:e}))}var Uo=null,ha=null;function SA(t){sT(t,0)}function Pc(t){var e=Zi(t);if(yE(e))return t}function CA(t,e){if(t==="change")return e}var QE=!1;if(Jn){var Xh;if(Jn){var Jh="oninput"in document;if(!Jh){var uy=document.createElement("div");uy.setAttribute("oninput","return;"),Jh=typeof uy.oninput=="function"}Xh=Jh}else Xh=!1;QE=Xh&&(!document.documentMode||9<document.documentMode)}function cy(){Uo&&(Uo.detachEvent("onpropertychange",YE),ha=Uo=null)}function YE(t){if(t.propertyName==="value"&&Pc(ha)){var e=[];KE(e,ha,t,Sp(t)),NE(SA,e)}}function kA(t,e,n){t==="focusin"?(cy(),Uo=e,ha=n,Uo.attachEvent("onpropertychange",YE)):t==="focusout"&&cy()}function RA(t){if(t==="selectionchange"||t==="keyup"||t==="keydown")return Pc(ha)}function AA(t,e){if(t==="click")return Pc(e)}function NA(t,e){if(t==="input"||t==="change")return Pc(e)}function PA(t,e){return t===e&&(t!==0||1/t===1/e)||t!==t&&e!==e}var pn=typeof Object.is=="function"?Object.is:PA;function da(t,e){if(pn(t,e))return!0;if(typeof t!="object"||t===null||typeof e!="object"||e===null)return!1;var n=Object.keys(t),r=Object.keys(e);if(n.length!==r.length)return!1;for(r=0;r<n.length;r++){var i=n[r];if(!Dd.call(e,i)||!pn(t[i],e[i]))return!1}return!0}function hy(t){for(;t&&t.firstChild;)t=t.firstChild;return t}function dy(t,e){var n=hy(t);t=0;for(var r;n;){if(n.nodeType===3){if(r=t+n.textContent.length,t<=e&&r>=e)return{node:n,offset:e-t};t=r}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=hy(n)}}function XE(t,e){return t&&e?t===e?!0:t&&t.nodeType===3?!1:e&&e.nodeType===3?XE(t,e.parentNode):"contains"in t?t.contains(e):t.compareDocumentPosition?!!(t.compareDocumentPosition(e)&16):!1:!1}function JE(){for(var t=window,e=Su();e instanceof t.HTMLIFrameElement;){try{var n=typeof e.contentWindow.location.href=="string"}catch{n=!1}if(n)t=e.contentWindow;else break;e=Su(t.document)}return e}function Dp(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e&&(e==="input"&&(t.type==="text"||t.type==="search"||t.type==="tel"||t.type==="url"||t.type==="password")||e==="textarea"||t.contentEditable==="true")}function xA(t){var e=JE(),n=t.focusedElem,r=t.selectionRange;if(e!==n&&n&&n.ownerDocument&&XE(n.ownerDocument.documentElement,n)){if(r!==null&&Dp(n)){if(e=r.start,t=r.end,t===void 0&&(t=e),"selectionStart"in n)n.selectionStart=e,n.selectionEnd=Math.min(t,n.value.length);else if(t=(e=n.ownerDocument||document)&&e.defaultView||window,t.getSelection){t=t.getSelection();var i=n.textContent.length,s=Math.min(r.start,i);r=r.end===void 0?s:Math.min(r.end,i),!t.extend&&s>r&&(i=r,r=s,s=i),i=dy(n,s);var o=dy(n,r);i&&o&&(t.rangeCount!==1||t.anchorNode!==i.node||t.anchorOffset!==i.offset||t.focusNode!==o.node||t.focusOffset!==o.offset)&&(e=e.createRange(),e.setStart(i.node,i.offset),t.removeAllRanges(),s>r?(t.addRange(e),t.extend(o.node,o.offset)):(e.setEnd(o.node,o.offset),t.addRange(e)))}}for(e=[],t=n;t=t.parentNode;)t.nodeType===1&&e.push({element:t,left:t.scrollLeft,top:t.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<e.length;n++)t=e[n],t.element.scrollLeft=t.left,t.element.scrollTop=t.top}}var bA=Jn&&"documentMode"in document&&11>=document.documentMode,Xi=null,Jd=null,$o=null,Zd=!1;function fy(t,e,n){var r=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;Zd||Xi==null||Xi!==Su(r)||(r=Xi,"selectionStart"in r&&Dp(r)?r={start:r.selectionStart,end:r.selectionEnd}:(r=(r.ownerDocument&&r.ownerDocument.defaultView||window).getSelection(),r={anchorNode:r.anchorNode,anchorOffset:r.anchorOffset,focusNode:r.focusNode,focusOffset:r.focusOffset}),$o&&da($o,r)||($o=r,r=xu(Jd,"onSelect"),0<r.length&&(e=new Pp("onSelect","select",null,e,n),t.push({event:e,listeners:r}),e.target=Xi)))}function jl(t,e){var n={};return n[t.toLowerCase()]=e.toLowerCase(),n["Webkit"+t]="webkit"+e,n["Moz"+t]="moz"+e,n}var Ji={animationend:jl("Animation","AnimationEnd"),animationiteration:jl("Animation","AnimationIteration"),animationstart:jl("Animation","AnimationStart"),transitionend:jl("Transition","TransitionEnd")},Zh={},ZE={};Jn&&(ZE=document.createElement("div").style,"AnimationEvent"in window||(delete Ji.animationend.animation,delete Ji.animationiteration.animation,delete Ji.animationstart.animation),"TransitionEvent"in window||delete Ji.transitionend.transition);function xc(t){if(Zh[t])return Zh[t];if(!Ji[t])return t;var e=Ji[t],n;for(n in e)if(e.hasOwnProperty(n)&&n in ZE)return Zh[t]=e[n];return t}var eT=xc("animationend"),tT=xc("animationiteration"),nT=xc("animationstart"),rT=xc("transitionend"),iT=new Map,py="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Yr(t,e){iT.set(t,e),Di(e,[t])}for(var ed=0;ed<py.length;ed++){var td=py[ed],DA=td.toLowerCase(),MA=td[0].toUpperCase()+td.slice(1);Yr(DA,"on"+MA)}Yr(eT,"onAnimationEnd");Yr(tT,"onAnimationIteration");Yr(nT,"onAnimationStart");Yr("dblclick","onDoubleClick");Yr("focusin","onFocus");Yr("focusout","onBlur");Yr(rT,"onTransitionEnd");ws("onMouseEnter",["mouseout","mouseover"]);ws("onMouseLeave",["mouseout","mouseover"]);ws("onPointerEnter",["pointerout","pointerover"]);ws("onPointerLeave",["pointerout","pointerover"]);Di("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));Di("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));Di("onBeforeInput",["compositionend","keypress","textInput","paste"]);Di("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));Di("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));Di("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var bo="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),OA=new Set("cancel close invalid load scroll toggle".split(" ").concat(bo));function my(t,e,n){var r=t.type||"unknown-event";t.currentTarget=n,DR(r,e,void 0,t),t.currentTarget=null}function sT(t,e){e=(e&4)!==0;for(var n=0;n<t.length;n++){var r=t[n],i=r.event;r=r.listeners;e:{var s=void 0;if(e)for(var o=r.length-1;0<=o;o--){var l=r[o],u=l.instance,c=l.currentTarget;if(l=l.listener,u!==s&&i.isPropagationStopped())break e;my(i,l,c),s=u}else for(o=0;o<r.length;o++){if(l=r[o],u=l.instance,c=l.currentTarget,l=l.listener,u!==s&&i.isPropagationStopped())break e;my(i,l,c),s=u}}}if(ku)throw t=Kd,ku=!1,Kd=null,t}function Ie(t,e){var n=e[sf];n===void 0&&(n=e[sf]=new Set);var r=t+"__bubble";n.has(r)||(oT(e,t,2,!1),n.add(r))}function nd(t,e,n){var r=0;e&&(r|=4),oT(n,t,r,e)}var Ul="_reactListening"+Math.random().toString(36).slice(2);function fa(t){if(!t[Ul]){t[Ul]=!0,fE.forEach(function(n){n!=="selectionchange"&&(OA.has(n)||nd(n,!1,t),nd(n,!0,t))});var e=t.nodeType===9?t:t.ownerDocument;e===null||e[Ul]||(e[Ul]=!0,nd("selectionchange",!1,e))}}function oT(t,e,n,r){switch(zE(e)){case 1:var i=QR;break;case 4:i=YR;break;default:i=Ap}n=i.bind(null,e,n,t),i=void 0,!Gd||e!=="touchstart"&&e!=="touchmove"&&e!=="wheel"||(i=!0),r?i!==void 0?t.addEventListener(e,n,{capture:!0,passive:i}):t.addEventListener(e,n,!0):i!==void 0?t.addEventListener(e,n,{passive:i}):t.addEventListener(e,n,!1)}function rd(t,e,n,r,i){var s=r;if(!(e&1)&&!(e&2)&&r!==null)e:for(;;){if(r===null)return;var o=r.tag;if(o===3||o===4){var l=r.stateNode.containerInfo;if(l===i||l.nodeType===8&&l.parentNode===i)break;if(o===4)for(o=r.return;o!==null;){var u=o.tag;if((u===3||u===4)&&(u=o.stateNode.containerInfo,u===i||u.nodeType===8&&u.parentNode===i))return;o=o.return}for(;l!==null;){if(o=li(l),o===null)return;if(u=o.tag,u===5||u===6){r=s=o;continue e}l=l.parentNode}}r=r.return}NE(function(){var c=s,d=Sp(n),p=[];e:{var m=iT.get(t);if(m!==void 0){var E=Pp,k=t;switch(t){case"keypress":if(su(n)===0)break e;case"keydown":case"keyup":E=hA;break;case"focusin":k="focus",E=Yh;break;case"focusout":k="blur",E=Yh;break;case"beforeblur":case"afterblur":E=Yh;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":E=ry;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":E=ZR;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":E=pA;break;case eT:case tT:case nT:E=nA;break;case rT:E=gA;break;case"scroll":E=XR;break;case"wheel":E=yA;break;case"copy":case"cut":case"paste":E=iA;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":E=sy}var x=(e&4)!==0,P=!x&&t==="scroll",S=x?m!==null?m+"Capture":null:m;x=[];for(var w=c,R;w!==null;){R=w;var D=R.stateNode;if(R.tag===5&&D!==null&&(R=D,S!==null&&(D=aa(w,S),D!=null&&x.push(pa(w,D,R)))),P)break;w=w.return}0<x.length&&(m=new E(m,k,null,n,d),p.push({event:m,listeners:x}))}}if(!(e&7)){e:{if(m=t==="mouseover"||t==="pointerover",E=t==="mouseout"||t==="pointerout",m&&n!==Hd&&(k=n.relatedTarget||n.fromElement)&&(li(k)||k[Zn]))break e;if((E||m)&&(m=d.window===d?d:(m=d.ownerDocument)?m.defaultView||m.parentWindow:window,E?(k=n.relatedTarget||n.toElement,E=c,k=k?li(k):null,k!==null&&(P=Mi(k),k!==P||k.tag!==5&&k.tag!==6)&&(k=null)):(E=null,k=c),E!==k)){if(x=ry,D="onMouseLeave",S="onMouseEnter",w="mouse",(t==="pointerout"||t==="pointerover")&&(x=sy,D="onPointerLeave",S="onPointerEnter",w="pointer"),P=E==null?m:Zi(E),R=k==null?m:Zi(k),m=new x(D,w+"leave",E,n,d),m.target=P,m.relatedTarget=R,D=null,li(d)===c&&(x=new x(S,w+"enter",k,n,d),x.target=R,x.relatedTarget=P,D=x),P=D,E&&k)t:{for(x=E,S=k,w=0,R=x;R;R=zi(R))w++;for(R=0,D=S;D;D=zi(D))R++;for(;0<w-R;)x=zi(x),w--;for(;0<R-w;)S=zi(S),R--;for(;w--;){if(x===S||S!==null&&x===S.alternate)break t;x=zi(x),S=zi(S)}x=null}else x=null;E!==null&&gy(p,m,E,x,!1),k!==null&&P!==null&&gy(p,P,k,x,!0)}}e:{if(m=c?Zi(c):window,E=m.nodeName&&m.nodeName.toLowerCase(),E==="select"||E==="input"&&m.type==="file")var j=CA;else if(ly(m))if(QE)j=NA;else{j=RA;var O=kA}else(E=m.nodeName)&&E.toLowerCase()==="input"&&(m.type==="checkbox"||m.type==="radio")&&(j=AA);if(j&&(j=j(t,c))){KE(p,j,n,d);break e}O&&O(t,m,c),t==="focusout"&&(O=m._wrapperState)&&O.controlled&&m.type==="number"&&Ud(m,"number",m.value)}switch(O=c?Zi(c):window,t){case"focusin":(ly(O)||O.contentEditable==="true")&&(Xi=O,Jd=c,$o=null);break;case"focusout":$o=Jd=Xi=null;break;case"mousedown":Zd=!0;break;case"contextmenu":case"mouseup":case"dragend":Zd=!1,fy(p,n,d);break;case"selectionchange":if(bA)break;case"keydown":case"keyup":fy(p,n,d)}var T;if(bp)e:{switch(t){case"compositionstart":var y="onCompositionStart";break e;case"compositionend":y="onCompositionEnd";break e;case"compositionupdate":y="onCompositionUpdate";break e}y=void 0}else Yi?qE(t,n)&&(y="onCompositionEnd"):t==="keydown"&&n.keyCode===229&&(y="onCompositionStart");y&&(HE&&n.locale!=="ko"&&(Yi||y!=="onCompositionStart"?y==="onCompositionEnd"&&Yi&&(T=WE()):(Sr=d,Np="value"in Sr?Sr.value:Sr.textContent,Yi=!0)),O=xu(c,y),0<O.length&&(y=new iy(y,t,null,n,d),p.push({event:y,listeners:O}),T?y.data=T:(T=GE(n),T!==null&&(y.data=T)))),(T=wA?EA(t,n):TA(t,n))&&(c=xu(c,"onBeforeInput"),0<c.length&&(d=new iy("onBeforeInput","beforeinput",null,n,d),p.push({event:d,listeners:c}),d.data=T))}sT(p,e)})}function pa(t,e,n){return{instance:t,listener:e,currentTarget:n}}function xu(t,e){for(var n=e+"Capture",r=[];t!==null;){var i=t,s=i.stateNode;i.tag===5&&s!==null&&(i=s,s=aa(t,n),s!=null&&r.unshift(pa(t,s,i)),s=aa(t,e),s!=null&&r.push(pa(t,s,i))),t=t.return}return r}function zi(t){if(t===null)return null;do t=t.return;while(t&&t.tag!==5);return t||null}function gy(t,e,n,r,i){for(var s=e._reactName,o=[];n!==null&&n!==r;){var l=n,u=l.alternate,c=l.stateNode;if(u!==null&&u===r)break;l.tag===5&&c!==null&&(l=c,i?(u=aa(n,s),u!=null&&o.unshift(pa(n,u,l))):i||(u=aa(n,s),u!=null&&o.push(pa(n,u,l)))),n=n.return}o.length!==0&&t.push({event:e,listeners:o})}var LA=/\r\n?/g,VA=/\u0000|\uFFFD/g;function _y(t){return(typeof t=="string"?t:""+t).replace(LA,`
`).replace(VA,"")}function $l(t,e,n){if(e=_y(e),_y(t)!==e&&n)throw Error(F(425))}function bu(){}var ef=null,tf=null;function nf(t,e){return t==="textarea"||t==="noscript"||typeof e.children=="string"||typeof e.children=="number"||typeof e.dangerouslySetInnerHTML=="object"&&e.dangerouslySetInnerHTML!==null&&e.dangerouslySetInnerHTML.__html!=null}var rf=typeof setTimeout=="function"?setTimeout:void 0,FA=typeof clearTimeout=="function"?clearTimeout:void 0,yy=typeof Promise=="function"?Promise:void 0,jA=typeof queueMicrotask=="function"?queueMicrotask:typeof yy<"u"?function(t){return yy.resolve(null).then(t).catch(UA)}:rf;function UA(t){setTimeout(function(){throw t})}function id(t,e){var n=e,r=0;do{var i=n.nextSibling;if(t.removeChild(n),i&&i.nodeType===8)if(n=i.data,n==="/$"){if(r===0){t.removeChild(i),ca(e);return}r--}else n!=="$"&&n!=="$?"&&n!=="$!"||r++;n=i}while(n);ca(e)}function Pr(t){for(;t!=null;t=t.nextSibling){var e=t.nodeType;if(e===1||e===3)break;if(e===8){if(e=t.data,e==="$"||e==="$!"||e==="$?")break;if(e==="/$")return null}}return t}function vy(t){t=t.previousSibling;for(var e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="$"||n==="$!"||n==="$?"){if(e===0)return t;e--}else n==="/$"&&e++}t=t.previousSibling}return null}var zs=Math.random().toString(36).slice(2),yn="__reactFiber$"+zs,ma="__reactProps$"+zs,Zn="__reactContainer$"+zs,sf="__reactEvents$"+zs,$A="__reactListeners$"+zs,BA="__reactHandles$"+zs;function li(t){var e=t[yn];if(e)return e;for(var n=t.parentNode;n;){if(e=n[Zn]||n[yn]){if(n=e.alternate,e.child!==null||n!==null&&n.child!==null)for(t=vy(t);t!==null;){if(n=t[yn])return n;t=vy(t)}return e}t=n,n=t.parentNode}return null}function qa(t){return t=t[yn]||t[Zn],!t||t.tag!==5&&t.tag!==6&&t.tag!==13&&t.tag!==3?null:t}function Zi(t){if(t.tag===5||t.tag===6)return t.stateNode;throw Error(F(33))}function bc(t){return t[ma]||null}var of=[],es=-1;function Xr(t){return{current:t}}function Ce(t){0>es||(t.current=of[es],of[es]=null,es--)}function Ee(t,e){es++,of[es]=t.current,t.current=e}var Br={},vt=Xr(Br),xt=Xr(!1),vi=Br;function Es(t,e){var n=t.type.contextTypes;if(!n)return Br;var r=t.stateNode;if(r&&r.__reactInternalMemoizedUnmaskedChildContext===e)return r.__reactInternalMemoizedMaskedChildContext;var i={},s;for(s in n)i[s]=e[s];return r&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=e,t.__reactInternalMemoizedMaskedChildContext=i),i}function bt(t){return t=t.childContextTypes,t!=null}function Du(){Ce(xt),Ce(vt)}function wy(t,e,n){if(vt.current!==Br)throw Error(F(168));Ee(vt,e),Ee(xt,n)}function aT(t,e,n){var r=t.stateNode;if(e=e.childContextTypes,typeof r.getChildContext!="function")return n;r=r.getChildContext();for(var i in r)if(!(i in e))throw Error(F(108,kR(t)||"Unknown",i));return Pe({},n,r)}function Mu(t){return t=(t=t.stateNode)&&t.__reactInternalMemoizedMergedChildContext||Br,vi=vt.current,Ee(vt,t),Ee(xt,xt.current),!0}function Ey(t,e,n){var r=t.stateNode;if(!r)throw Error(F(169));n?(t=aT(t,e,vi),r.__reactInternalMemoizedMergedChildContext=t,Ce(xt),Ce(vt),Ee(vt,t)):Ce(xt),Ee(xt,n)}var $n=null,Dc=!1,sd=!1;function lT(t){$n===null?$n=[t]:$n.push(t)}function zA(t){Dc=!0,lT(t)}function Jr(){if(!sd&&$n!==null){sd=!0;var t=0,e=fe;try{var n=$n;for(fe=1;t<n.length;t++){var r=n[t];do r=r(!0);while(r!==null)}$n=null,Dc=!1}catch(i){throw $n!==null&&($n=$n.slice(t+1)),DE(Cp,Jr),i}finally{fe=e,sd=!1}}return null}var ts=[],ns=0,Ou=null,Lu=0,qt=[],Gt=0,wi=null,zn=1,Wn="";function ii(t,e){ts[ns++]=Lu,ts[ns++]=Ou,Ou=t,Lu=e}function uT(t,e,n){qt[Gt++]=zn,qt[Gt++]=Wn,qt[Gt++]=wi,wi=t;var r=zn;t=Wn;var i=32-cn(r)-1;r&=~(1<<i),n+=1;var s=32-cn(e)+i;if(30<s){var o=i-i%5;s=(r&(1<<o)-1).toString(32),r>>=o,i-=o,zn=1<<32-cn(e)+i|n<<i|r,Wn=s+t}else zn=1<<s|n<<i|r,Wn=t}function Mp(t){t.return!==null&&(ii(t,1),uT(t,1,0))}function Op(t){for(;t===Ou;)Ou=ts[--ns],ts[ns]=null,Lu=ts[--ns],ts[ns]=null;for(;t===wi;)wi=qt[--Gt],qt[Gt]=null,Wn=qt[--Gt],qt[Gt]=null,zn=qt[--Gt],qt[Gt]=null}var Bt=null,$t=null,ke=!1,sn=null;function cT(t,e){var n=Qt(5,null,null,0);n.elementType="DELETED",n.stateNode=e,n.return=t,e=t.deletions,e===null?(t.deletions=[n],t.flags|=16):e.push(n)}function Ty(t,e){switch(t.tag){case 5:var n=t.type;return e=e.nodeType!==1||n.toLowerCase()!==e.nodeName.toLowerCase()?null:e,e!==null?(t.stateNode=e,Bt=t,$t=Pr(e.firstChild),!0):!1;case 6:return e=t.pendingProps===""||e.nodeType!==3?null:e,e!==null?(t.stateNode=e,Bt=t,$t=null,!0):!1;case 13:return e=e.nodeType!==8?null:e,e!==null?(n=wi!==null?{id:zn,overflow:Wn}:null,t.memoizedState={dehydrated:e,treeContext:n,retryLane:1073741824},n=Qt(18,null,null,0),n.stateNode=e,n.return=t,t.child=n,Bt=t,$t=null,!0):!1;default:return!1}}function af(t){return(t.mode&1)!==0&&(t.flags&128)===0}function lf(t){if(ke){var e=$t;if(e){var n=e;if(!Ty(t,e)){if(af(t))throw Error(F(418));e=Pr(n.nextSibling);var r=Bt;e&&Ty(t,e)?cT(r,n):(t.flags=t.flags&-4097|2,ke=!1,Bt=t)}}else{if(af(t))throw Error(F(418));t.flags=t.flags&-4097|2,ke=!1,Bt=t}}}function Iy(t){for(t=t.return;t!==null&&t.tag!==5&&t.tag!==3&&t.tag!==13;)t=t.return;Bt=t}function Bl(t){if(t!==Bt)return!1;if(!ke)return Iy(t),ke=!0,!1;var e;if((e=t.tag!==3)&&!(e=t.tag!==5)&&(e=t.type,e=e!=="head"&&e!=="body"&&!nf(t.type,t.memoizedProps)),e&&(e=$t)){if(af(t))throw hT(),Error(F(418));for(;e;)cT(t,e),e=Pr(e.nextSibling)}if(Iy(t),t.tag===13){if(t=t.memoizedState,t=t!==null?t.dehydrated:null,!t)throw Error(F(317));e:{for(t=t.nextSibling,e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="/$"){if(e===0){$t=Pr(t.nextSibling);break e}e--}else n!=="$"&&n!=="$!"&&n!=="$?"||e++}t=t.nextSibling}$t=null}}else $t=Bt?Pr(t.stateNode.nextSibling):null;return!0}function hT(){for(var t=$t;t;)t=Pr(t.nextSibling)}function Ts(){$t=Bt=null,ke=!1}function Lp(t){sn===null?sn=[t]:sn.push(t)}var WA=lr.ReactCurrentBatchConfig;function Eo(t,e,n){if(t=n.ref,t!==null&&typeof t!="function"&&typeof t!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(F(309));var r=n.stateNode}if(!r)throw Error(F(147,t));var i=r,s=""+t;return e!==null&&e.ref!==null&&typeof e.ref=="function"&&e.ref._stringRef===s?e.ref:(e=function(o){var l=i.refs;o===null?delete l[s]:l[s]=o},e._stringRef=s,e)}if(typeof t!="string")throw Error(F(284));if(!n._owner)throw Error(F(290,t))}return t}function zl(t,e){throw t=Object.prototype.toString.call(e),Error(F(31,t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t))}function Sy(t){var e=t._init;return e(t._payload)}function dT(t){function e(S,w){if(t){var R=S.deletions;R===null?(S.deletions=[w],S.flags|=16):R.push(w)}}function n(S,w){if(!t)return null;for(;w!==null;)e(S,w),w=w.sibling;return null}function r(S,w){for(S=new Map;w!==null;)w.key!==null?S.set(w.key,w):S.set(w.index,w),w=w.sibling;return S}function i(S,w){return S=Mr(S,w),S.index=0,S.sibling=null,S}function s(S,w,R){return S.index=R,t?(R=S.alternate,R!==null?(R=R.index,R<w?(S.flags|=2,w):R):(S.flags|=2,w)):(S.flags|=1048576,w)}function o(S){return t&&S.alternate===null&&(S.flags|=2),S}function l(S,w,R,D){return w===null||w.tag!==6?(w=dd(R,S.mode,D),w.return=S,w):(w=i(w,R),w.return=S,w)}function u(S,w,R,D){var j=R.type;return j===Qi?d(S,w,R.props.children,D,R.key):w!==null&&(w.elementType===j||typeof j=="object"&&j!==null&&j.$$typeof===_r&&Sy(j)===w.type)?(D=i(w,R.props),D.ref=Eo(S,w,R),D.return=S,D):(D=du(R.type,R.key,R.props,null,S.mode,D),D.ref=Eo(S,w,R),D.return=S,D)}function c(S,w,R,D){return w===null||w.tag!==4||w.stateNode.containerInfo!==R.containerInfo||w.stateNode.implementation!==R.implementation?(w=fd(R,S.mode,D),w.return=S,w):(w=i(w,R.children||[]),w.return=S,w)}function d(S,w,R,D,j){return w===null||w.tag!==7?(w=gi(R,S.mode,D,j),w.return=S,w):(w=i(w,R),w.return=S,w)}function p(S,w,R){if(typeof w=="string"&&w!==""||typeof w=="number")return w=dd(""+w,S.mode,R),w.return=S,w;if(typeof w=="object"&&w!==null){switch(w.$$typeof){case bl:return R=du(w.type,w.key,w.props,null,S.mode,R),R.ref=Eo(S,null,w),R.return=S,R;case Ki:return w=fd(w,S.mode,R),w.return=S,w;case _r:var D=w._init;return p(S,D(w._payload),R)}if(Po(w)||go(w))return w=gi(w,S.mode,R,null),w.return=S,w;zl(S,w)}return null}function m(S,w,R,D){var j=w!==null?w.key:null;if(typeof R=="string"&&R!==""||typeof R=="number")return j!==null?null:l(S,w,""+R,D);if(typeof R=="object"&&R!==null){switch(R.$$typeof){case bl:return R.key===j?u(S,w,R,D):null;case Ki:return R.key===j?c(S,w,R,D):null;case _r:return j=R._init,m(S,w,j(R._payload),D)}if(Po(R)||go(R))return j!==null?null:d(S,w,R,D,null);zl(S,R)}return null}function E(S,w,R,D,j){if(typeof D=="string"&&D!==""||typeof D=="number")return S=S.get(R)||null,l(w,S,""+D,j);if(typeof D=="object"&&D!==null){switch(D.$$typeof){case bl:return S=S.get(D.key===null?R:D.key)||null,u(w,S,D,j);case Ki:return S=S.get(D.key===null?R:D.key)||null,c(w,S,D,j);case _r:var O=D._init;return E(S,w,R,O(D._payload),j)}if(Po(D)||go(D))return S=S.get(R)||null,d(w,S,D,j,null);zl(w,D)}return null}function k(S,w,R,D){for(var j=null,O=null,T=w,y=w=0,v=null;T!==null&&y<R.length;y++){T.index>y?(v=T,T=null):v=T.sibling;var I=m(S,T,R[y],D);if(I===null){T===null&&(T=v);break}t&&T&&I.alternate===null&&e(S,T),w=s(I,w,y),O===null?j=I:O.sibling=I,O=I,T=v}if(y===R.length)return n(S,T),ke&&ii(S,y),j;if(T===null){for(;y<R.length;y++)T=p(S,R[y],D),T!==null&&(w=s(T,w,y),O===null?j=T:O.sibling=T,O=T);return ke&&ii(S,y),j}for(T=r(S,T);y<R.length;y++)v=E(T,S,y,R[y],D),v!==null&&(t&&v.alternate!==null&&T.delete(v.key===null?y:v.key),w=s(v,w,y),O===null?j=v:O.sibling=v,O=v);return t&&T.forEach(function(A){return e(S,A)}),ke&&ii(S,y),j}function x(S,w,R,D){var j=go(R);if(typeof j!="function")throw Error(F(150));if(R=j.call(R),R==null)throw Error(F(151));for(var O=j=null,T=w,y=w=0,v=null,I=R.next();T!==null&&!I.done;y++,I=R.next()){T.index>y?(v=T,T=null):v=T.sibling;var A=m(S,T,I.value,D);if(A===null){T===null&&(T=v);break}t&&T&&A.alternate===null&&e(S,T),w=s(A,w,y),O===null?j=A:O.sibling=A,O=A,T=v}if(I.done)return n(S,T),ke&&ii(S,y),j;if(T===null){for(;!I.done;y++,I=R.next())I=p(S,I.value,D),I!==null&&(w=s(I,w,y),O===null?j=I:O.sibling=I,O=I);return ke&&ii(S,y),j}for(T=r(S,T);!I.done;y++,I=R.next())I=E(T,S,y,I.value,D),I!==null&&(t&&I.alternate!==null&&T.delete(I.key===null?y:I.key),w=s(I,w,y),O===null?j=I:O.sibling=I,O=I);return t&&T.forEach(function(N){return e(S,N)}),ke&&ii(S,y),j}function P(S,w,R,D){if(typeof R=="object"&&R!==null&&R.type===Qi&&R.key===null&&(R=R.props.children),typeof R=="object"&&R!==null){switch(R.$$typeof){case bl:e:{for(var j=R.key,O=w;O!==null;){if(O.key===j){if(j=R.type,j===Qi){if(O.tag===7){n(S,O.sibling),w=i(O,R.props.children),w.return=S,S=w;break e}}else if(O.elementType===j||typeof j=="object"&&j!==null&&j.$$typeof===_r&&Sy(j)===O.type){n(S,O.sibling),w=i(O,R.props),w.ref=Eo(S,O,R),w.return=S,S=w;break e}n(S,O);break}else e(S,O);O=O.sibling}R.type===Qi?(w=gi(R.props.children,S.mode,D,R.key),w.return=S,S=w):(D=du(R.type,R.key,R.props,null,S.mode,D),D.ref=Eo(S,w,R),D.return=S,S=D)}return o(S);case Ki:e:{for(O=R.key;w!==null;){if(w.key===O)if(w.tag===4&&w.stateNode.containerInfo===R.containerInfo&&w.stateNode.implementation===R.implementation){n(S,w.sibling),w=i(w,R.children||[]),w.return=S,S=w;break e}else{n(S,w);break}else e(S,w);w=w.sibling}w=fd(R,S.mode,D),w.return=S,S=w}return o(S);case _r:return O=R._init,P(S,w,O(R._payload),D)}if(Po(R))return k(S,w,R,D);if(go(R))return x(S,w,R,D);zl(S,R)}return typeof R=="string"&&R!==""||typeof R=="number"?(R=""+R,w!==null&&w.tag===6?(n(S,w.sibling),w=i(w,R),w.return=S,S=w):(n(S,w),w=dd(R,S.mode,D),w.return=S,S=w),o(S)):n(S,w)}return P}var Is=dT(!0),fT=dT(!1),Vu=Xr(null),Fu=null,rs=null,Vp=null;function Fp(){Vp=rs=Fu=null}function jp(t){var e=Vu.current;Ce(Vu),t._currentValue=e}function uf(t,e,n){for(;t!==null;){var r=t.alternate;if((t.childLanes&e)!==e?(t.childLanes|=e,r!==null&&(r.childLanes|=e)):r!==null&&(r.childLanes&e)!==e&&(r.childLanes|=e),t===n)break;t=t.return}}function hs(t,e){Fu=t,Vp=rs=null,t=t.dependencies,t!==null&&t.firstContext!==null&&(t.lanes&e&&(Pt=!0),t.firstContext=null)}function Jt(t){var e=t._currentValue;if(Vp!==t)if(t={context:t,memoizedValue:e,next:null},rs===null){if(Fu===null)throw Error(F(308));rs=t,Fu.dependencies={lanes:0,firstContext:t}}else rs=rs.next=t;return e}var ui=null;function Up(t){ui===null?ui=[t]:ui.push(t)}function pT(t,e,n,r){var i=e.interleaved;return i===null?(n.next=n,Up(e)):(n.next=i.next,i.next=n),e.interleaved=n,er(t,r)}function er(t,e){t.lanes|=e;var n=t.alternate;for(n!==null&&(n.lanes|=e),n=t,t=t.return;t!==null;)t.childLanes|=e,n=t.alternate,n!==null&&(n.childLanes|=e),n=t,t=t.return;return n.tag===3?n.stateNode:null}var yr=!1;function $p(t){t.updateQueue={baseState:t.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function mT(t,e){t=t.updateQueue,e.updateQueue===t&&(e.updateQueue={baseState:t.baseState,firstBaseUpdate:t.firstBaseUpdate,lastBaseUpdate:t.lastBaseUpdate,shared:t.shared,effects:t.effects})}function Qn(t,e){return{eventTime:t,lane:e,tag:0,payload:null,callback:null,next:null}}function xr(t,e,n){var r=t.updateQueue;if(r===null)return null;if(r=r.shared,ue&2){var i=r.pending;return i===null?e.next=e:(e.next=i.next,i.next=e),r.pending=e,er(t,n)}return i=r.interleaved,i===null?(e.next=e,Up(r)):(e.next=i.next,i.next=e),r.interleaved=e,er(t,n)}function ou(t,e,n){if(e=e.updateQueue,e!==null&&(e=e.shared,(n&4194240)!==0)){var r=e.lanes;r&=t.pendingLanes,n|=r,e.lanes=n,kp(t,n)}}function Cy(t,e){var n=t.updateQueue,r=t.alternate;if(r!==null&&(r=r.updateQueue,n===r)){var i=null,s=null;if(n=n.firstBaseUpdate,n!==null){do{var o={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};s===null?i=s=o:s=s.next=o,n=n.next}while(n!==null);s===null?i=s=e:s=s.next=e}else i=s=e;n={baseState:r.baseState,firstBaseUpdate:i,lastBaseUpdate:s,shared:r.shared,effects:r.effects},t.updateQueue=n;return}t=n.lastBaseUpdate,t===null?n.firstBaseUpdate=e:t.next=e,n.lastBaseUpdate=e}function ju(t,e,n,r){var i=t.updateQueue;yr=!1;var s=i.firstBaseUpdate,o=i.lastBaseUpdate,l=i.shared.pending;if(l!==null){i.shared.pending=null;var u=l,c=u.next;u.next=null,o===null?s=c:o.next=c,o=u;var d=t.alternate;d!==null&&(d=d.updateQueue,l=d.lastBaseUpdate,l!==o&&(l===null?d.firstBaseUpdate=c:l.next=c,d.lastBaseUpdate=u))}if(s!==null){var p=i.baseState;o=0,d=c=u=null,l=s;do{var m=l.lane,E=l.eventTime;if((r&m)===m){d!==null&&(d=d.next={eventTime:E,lane:0,tag:l.tag,payload:l.payload,callback:l.callback,next:null});e:{var k=t,x=l;switch(m=e,E=n,x.tag){case 1:if(k=x.payload,typeof k=="function"){p=k.call(E,p,m);break e}p=k;break e;case 3:k.flags=k.flags&-65537|128;case 0:if(k=x.payload,m=typeof k=="function"?k.call(E,p,m):k,m==null)break e;p=Pe({},p,m);break e;case 2:yr=!0}}l.callback!==null&&l.lane!==0&&(t.flags|=64,m=i.effects,m===null?i.effects=[l]:m.push(l))}else E={eventTime:E,lane:m,tag:l.tag,payload:l.payload,callback:l.callback,next:null},d===null?(c=d=E,u=p):d=d.next=E,o|=m;if(l=l.next,l===null){if(l=i.shared.pending,l===null)break;m=l,l=m.next,m.next=null,i.lastBaseUpdate=m,i.shared.pending=null}}while(!0);if(d===null&&(u=p),i.baseState=u,i.firstBaseUpdate=c,i.lastBaseUpdate=d,e=i.shared.interleaved,e!==null){i=e;do o|=i.lane,i=i.next;while(i!==e)}else s===null&&(i.shared.lanes=0);Ti|=o,t.lanes=o,t.memoizedState=p}}function ky(t,e,n){if(t=e.effects,e.effects=null,t!==null)for(e=0;e<t.length;e++){var r=t[e],i=r.callback;if(i!==null){if(r.callback=null,r=n,typeof i!="function")throw Error(F(191,i));i.call(r)}}}var Ga={},In=Xr(Ga),ga=Xr(Ga),_a=Xr(Ga);function ci(t){if(t===Ga)throw Error(F(174));return t}function Bp(t,e){switch(Ee(_a,e),Ee(ga,t),Ee(In,Ga),t=e.nodeType,t){case 9:case 11:e=(e=e.documentElement)?e.namespaceURI:Bd(null,"");break;default:t=t===8?e.parentNode:e,e=t.namespaceURI||null,t=t.tagName,e=Bd(e,t)}Ce(In),Ee(In,e)}function Ss(){Ce(In),Ce(ga),Ce(_a)}function gT(t){ci(_a.current);var e=ci(In.current),n=Bd(e,t.type);e!==n&&(Ee(ga,t),Ee(In,n))}function zp(t){ga.current===t&&(Ce(In),Ce(ga))}var Ae=Xr(0);function Uu(t){for(var e=t;e!==null;){if(e.tag===13){var n=e.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return e}else if(e.tag===19&&e.memoizedProps.revealOrder!==void 0){if(e.flags&128)return e}else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return null;e=e.return}e.sibling.return=e.return,e=e.sibling}return null}var od=[];function Wp(){for(var t=0;t<od.length;t++)od[t]._workInProgressVersionPrimary=null;od.length=0}var au=lr.ReactCurrentDispatcher,ad=lr.ReactCurrentBatchConfig,Ei=0,Ne=null,$e=null,Qe=null,$u=!1,Bo=!1,ya=0,HA=0;function ht(){throw Error(F(321))}function Hp(t,e){if(e===null)return!1;for(var n=0;n<e.length&&n<t.length;n++)if(!pn(t[n],e[n]))return!1;return!0}function qp(t,e,n,r,i,s){if(Ei=s,Ne=e,e.memoizedState=null,e.updateQueue=null,e.lanes=0,au.current=t===null||t.memoizedState===null?QA:YA,t=n(r,i),Bo){s=0;do{if(Bo=!1,ya=0,25<=s)throw Error(F(301));s+=1,Qe=$e=null,e.updateQueue=null,au.current=XA,t=n(r,i)}while(Bo)}if(au.current=Bu,e=$e!==null&&$e.next!==null,Ei=0,Qe=$e=Ne=null,$u=!1,e)throw Error(F(300));return t}function Gp(){var t=ya!==0;return ya=0,t}function _n(){var t={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Qe===null?Ne.memoizedState=Qe=t:Qe=Qe.next=t,Qe}function Zt(){if($e===null){var t=Ne.alternate;t=t!==null?t.memoizedState:null}else t=$e.next;var e=Qe===null?Ne.memoizedState:Qe.next;if(e!==null)Qe=e,$e=t;else{if(t===null)throw Error(F(310));$e=t,t={memoizedState:$e.memoizedState,baseState:$e.baseState,baseQueue:$e.baseQueue,queue:$e.queue,next:null},Qe===null?Ne.memoizedState=Qe=t:Qe=Qe.next=t}return Qe}function va(t,e){return typeof e=="function"?e(t):e}function ld(t){var e=Zt(),n=e.queue;if(n===null)throw Error(F(311));n.lastRenderedReducer=t;var r=$e,i=r.baseQueue,s=n.pending;if(s!==null){if(i!==null){var o=i.next;i.next=s.next,s.next=o}r.baseQueue=i=s,n.pending=null}if(i!==null){s=i.next,r=r.baseState;var l=o=null,u=null,c=s;do{var d=c.lane;if((Ei&d)===d)u!==null&&(u=u.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),r=c.hasEagerState?c.eagerState:t(r,c.action);else{var p={lane:d,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};u===null?(l=u=p,o=r):u=u.next=p,Ne.lanes|=d,Ti|=d}c=c.next}while(c!==null&&c!==s);u===null?o=r:u.next=l,pn(r,e.memoizedState)||(Pt=!0),e.memoizedState=r,e.baseState=o,e.baseQueue=u,n.lastRenderedState=r}if(t=n.interleaved,t!==null){i=t;do s=i.lane,Ne.lanes|=s,Ti|=s,i=i.next;while(i!==t)}else i===null&&(n.lanes=0);return[e.memoizedState,n.dispatch]}function ud(t){var e=Zt(),n=e.queue;if(n===null)throw Error(F(311));n.lastRenderedReducer=t;var r=n.dispatch,i=n.pending,s=e.memoizedState;if(i!==null){n.pending=null;var o=i=i.next;do s=t(s,o.action),o=o.next;while(o!==i);pn(s,e.memoizedState)||(Pt=!0),e.memoizedState=s,e.baseQueue===null&&(e.baseState=s),n.lastRenderedState=s}return[s,r]}function _T(){}function yT(t,e){var n=Ne,r=Zt(),i=e(),s=!pn(r.memoizedState,i);if(s&&(r.memoizedState=i,Pt=!0),r=r.queue,Kp(ET.bind(null,n,r,t),[t]),r.getSnapshot!==e||s||Qe!==null&&Qe.memoizedState.tag&1){if(n.flags|=2048,wa(9,wT.bind(null,n,r,i,e),void 0,null),Xe===null)throw Error(F(349));Ei&30||vT(n,e,i)}return i}function vT(t,e,n){t.flags|=16384,t={getSnapshot:e,value:n},e=Ne.updateQueue,e===null?(e={lastEffect:null,stores:null},Ne.updateQueue=e,e.stores=[t]):(n=e.stores,n===null?e.stores=[t]:n.push(t))}function wT(t,e,n,r){e.value=n,e.getSnapshot=r,TT(e)&&IT(t)}function ET(t,e,n){return n(function(){TT(e)&&IT(t)})}function TT(t){var e=t.getSnapshot;t=t.value;try{var n=e();return!pn(t,n)}catch{return!0}}function IT(t){var e=er(t,1);e!==null&&hn(e,t,1,-1)}function Ry(t){var e=_n();return typeof t=="function"&&(t=t()),e.memoizedState=e.baseState=t,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:va,lastRenderedState:t},e.queue=t,t=t.dispatch=KA.bind(null,Ne,t),[e.memoizedState,t]}function wa(t,e,n,r){return t={tag:t,create:e,destroy:n,deps:r,next:null},e=Ne.updateQueue,e===null?(e={lastEffect:null,stores:null},Ne.updateQueue=e,e.lastEffect=t.next=t):(n=e.lastEffect,n===null?e.lastEffect=t.next=t:(r=n.next,n.next=t,t.next=r,e.lastEffect=t)),t}function ST(){return Zt().memoizedState}function lu(t,e,n,r){var i=_n();Ne.flags|=t,i.memoizedState=wa(1|e,n,void 0,r===void 0?null:r)}function Mc(t,e,n,r){var i=Zt();r=r===void 0?null:r;var s=void 0;if($e!==null){var o=$e.memoizedState;if(s=o.destroy,r!==null&&Hp(r,o.deps)){i.memoizedState=wa(e,n,s,r);return}}Ne.flags|=t,i.memoizedState=wa(1|e,n,s,r)}function Ay(t,e){return lu(8390656,8,t,e)}function Kp(t,e){return Mc(2048,8,t,e)}function CT(t,e){return Mc(4,2,t,e)}function kT(t,e){return Mc(4,4,t,e)}function RT(t,e){if(typeof e=="function")return t=t(),e(t),function(){e(null)};if(e!=null)return t=t(),e.current=t,function(){e.current=null}}function AT(t,e,n){return n=n!=null?n.concat([t]):null,Mc(4,4,RT.bind(null,e,t),n)}function Qp(){}function NT(t,e){var n=Zt();e=e===void 0?null:e;var r=n.memoizedState;return r!==null&&e!==null&&Hp(e,r[1])?r[0]:(n.memoizedState=[t,e],t)}function PT(t,e){var n=Zt();e=e===void 0?null:e;var r=n.memoizedState;return r!==null&&e!==null&&Hp(e,r[1])?r[0]:(t=t(),n.memoizedState=[t,e],t)}function xT(t,e,n){return Ei&21?(pn(n,e)||(n=LE(),Ne.lanes|=n,Ti|=n,t.baseState=!0),e):(t.baseState&&(t.baseState=!1,Pt=!0),t.memoizedState=n)}function qA(t,e){var n=fe;fe=n!==0&&4>n?n:4,t(!0);var r=ad.transition;ad.transition={};try{t(!1),e()}finally{fe=n,ad.transition=r}}function bT(){return Zt().memoizedState}function GA(t,e,n){var r=Dr(t);if(n={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null},DT(t))MT(e,n);else if(n=pT(t,e,n,r),n!==null){var i=Ct();hn(n,t,r,i),OT(n,e,r)}}function KA(t,e,n){var r=Dr(t),i={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null};if(DT(t))MT(e,i);else{var s=t.alternate;if(t.lanes===0&&(s===null||s.lanes===0)&&(s=e.lastRenderedReducer,s!==null))try{var o=e.lastRenderedState,l=s(o,n);if(i.hasEagerState=!0,i.eagerState=l,pn(l,o)){var u=e.interleaved;u===null?(i.next=i,Up(e)):(i.next=u.next,u.next=i),e.interleaved=i;return}}catch{}finally{}n=pT(t,e,i,r),n!==null&&(i=Ct(),hn(n,t,r,i),OT(n,e,r))}}function DT(t){var e=t.alternate;return t===Ne||e!==null&&e===Ne}function MT(t,e){Bo=$u=!0;var n=t.pending;n===null?e.next=e:(e.next=n.next,n.next=e),t.pending=e}function OT(t,e,n){if(n&4194240){var r=e.lanes;r&=t.pendingLanes,n|=r,e.lanes=n,kp(t,n)}}var Bu={readContext:Jt,useCallback:ht,useContext:ht,useEffect:ht,useImperativeHandle:ht,useInsertionEffect:ht,useLayoutEffect:ht,useMemo:ht,useReducer:ht,useRef:ht,useState:ht,useDebugValue:ht,useDeferredValue:ht,useTransition:ht,useMutableSource:ht,useSyncExternalStore:ht,useId:ht,unstable_isNewReconciler:!1},QA={readContext:Jt,useCallback:function(t,e){return _n().memoizedState=[t,e===void 0?null:e],t},useContext:Jt,useEffect:Ay,useImperativeHandle:function(t,e,n){return n=n!=null?n.concat([t]):null,lu(4194308,4,RT.bind(null,e,t),n)},useLayoutEffect:function(t,e){return lu(4194308,4,t,e)},useInsertionEffect:function(t,e){return lu(4,2,t,e)},useMemo:function(t,e){var n=_n();return e=e===void 0?null:e,t=t(),n.memoizedState=[t,e],t},useReducer:function(t,e,n){var r=_n();return e=n!==void 0?n(e):e,r.memoizedState=r.baseState=e,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:t,lastRenderedState:e},r.queue=t,t=t.dispatch=GA.bind(null,Ne,t),[r.memoizedState,t]},useRef:function(t){var e=_n();return t={current:t},e.memoizedState=t},useState:Ry,useDebugValue:Qp,useDeferredValue:function(t){return _n().memoizedState=t},useTransition:function(){var t=Ry(!1),e=t[0];return t=qA.bind(null,t[1]),_n().memoizedState=t,[e,t]},useMutableSource:function(){},useSyncExternalStore:function(t,e,n){var r=Ne,i=_n();if(ke){if(n===void 0)throw Error(F(407));n=n()}else{if(n=e(),Xe===null)throw Error(F(349));Ei&30||vT(r,e,n)}i.memoizedState=n;var s={value:n,getSnapshot:e};return i.queue=s,Ay(ET.bind(null,r,s,t),[t]),r.flags|=2048,wa(9,wT.bind(null,r,s,n,e),void 0,null),n},useId:function(){var t=_n(),e=Xe.identifierPrefix;if(ke){var n=Wn,r=zn;n=(r&~(1<<32-cn(r)-1)).toString(32)+n,e=":"+e+"R"+n,n=ya++,0<n&&(e+="H"+n.toString(32)),e+=":"}else n=HA++,e=":"+e+"r"+n.toString(32)+":";return t.memoizedState=e},unstable_isNewReconciler:!1},YA={readContext:Jt,useCallback:NT,useContext:Jt,useEffect:Kp,useImperativeHandle:AT,useInsertionEffect:CT,useLayoutEffect:kT,useMemo:PT,useReducer:ld,useRef:ST,useState:function(){return ld(va)},useDebugValue:Qp,useDeferredValue:function(t){var e=Zt();return xT(e,$e.memoizedState,t)},useTransition:function(){var t=ld(va)[0],e=Zt().memoizedState;return[t,e]},useMutableSource:_T,useSyncExternalStore:yT,useId:bT,unstable_isNewReconciler:!1},XA={readContext:Jt,useCallback:NT,useContext:Jt,useEffect:Kp,useImperativeHandle:AT,useInsertionEffect:CT,useLayoutEffect:kT,useMemo:PT,useReducer:ud,useRef:ST,useState:function(){return ud(va)},useDebugValue:Qp,useDeferredValue:function(t){var e=Zt();return $e===null?e.memoizedState=t:xT(e,$e.memoizedState,t)},useTransition:function(){var t=ud(va)[0],e=Zt().memoizedState;return[t,e]},useMutableSource:_T,useSyncExternalStore:yT,useId:bT,unstable_isNewReconciler:!1};function nn(t,e){if(t&&t.defaultProps){e=Pe({},e),t=t.defaultProps;for(var n in t)e[n]===void 0&&(e[n]=t[n]);return e}return e}function cf(t,e,n,r){e=t.memoizedState,n=n(r,e),n=n==null?e:Pe({},e,n),t.memoizedState=n,t.lanes===0&&(t.updateQueue.baseState=n)}var Oc={isMounted:function(t){return(t=t._reactInternals)?Mi(t)===t:!1},enqueueSetState:function(t,e,n){t=t._reactInternals;var r=Ct(),i=Dr(t),s=Qn(r,i);s.payload=e,n!=null&&(s.callback=n),e=xr(t,s,i),e!==null&&(hn(e,t,i,r),ou(e,t,i))},enqueueReplaceState:function(t,e,n){t=t._reactInternals;var r=Ct(),i=Dr(t),s=Qn(r,i);s.tag=1,s.payload=e,n!=null&&(s.callback=n),e=xr(t,s,i),e!==null&&(hn(e,t,i,r),ou(e,t,i))},enqueueForceUpdate:function(t,e){t=t._reactInternals;var n=Ct(),r=Dr(t),i=Qn(n,r);i.tag=2,e!=null&&(i.callback=e),e=xr(t,i,r),e!==null&&(hn(e,t,r,n),ou(e,t,r))}};function Ny(t,e,n,r,i,s,o){return t=t.stateNode,typeof t.shouldComponentUpdate=="function"?t.shouldComponentUpdate(r,s,o):e.prototype&&e.prototype.isPureReactComponent?!da(n,r)||!da(i,s):!0}function LT(t,e,n){var r=!1,i=Br,s=e.contextType;return typeof s=="object"&&s!==null?s=Jt(s):(i=bt(e)?vi:vt.current,r=e.contextTypes,s=(r=r!=null)?Es(t,i):Br),e=new e(n,s),t.memoizedState=e.state!==null&&e.state!==void 0?e.state:null,e.updater=Oc,t.stateNode=e,e._reactInternals=t,r&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=i,t.__reactInternalMemoizedMaskedChildContext=s),e}function Py(t,e,n,r){t=e.state,typeof e.componentWillReceiveProps=="function"&&e.componentWillReceiveProps(n,r),typeof e.UNSAFE_componentWillReceiveProps=="function"&&e.UNSAFE_componentWillReceiveProps(n,r),e.state!==t&&Oc.enqueueReplaceState(e,e.state,null)}function hf(t,e,n,r){var i=t.stateNode;i.props=n,i.state=t.memoizedState,i.refs={},$p(t);var s=e.contextType;typeof s=="object"&&s!==null?i.context=Jt(s):(s=bt(e)?vi:vt.current,i.context=Es(t,s)),i.state=t.memoizedState,s=e.getDerivedStateFromProps,typeof s=="function"&&(cf(t,e,s,n),i.state=t.memoizedState),typeof e.getDerivedStateFromProps=="function"||typeof i.getSnapshotBeforeUpdate=="function"||typeof i.UNSAFE_componentWillMount!="function"&&typeof i.componentWillMount!="function"||(e=i.state,typeof i.componentWillMount=="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount=="function"&&i.UNSAFE_componentWillMount(),e!==i.state&&Oc.enqueueReplaceState(i,i.state,null),ju(t,n,i,r),i.state=t.memoizedState),typeof i.componentDidMount=="function"&&(t.flags|=4194308)}function Cs(t,e){try{var n="",r=e;do n+=CR(r),r=r.return;while(r);var i=n}catch(s){i=`
Error generating stack: `+s.message+`
`+s.stack}return{value:t,source:e,stack:i,digest:null}}function cd(t,e,n){return{value:t,source:null,stack:n??null,digest:e??null}}function df(t,e){try{console.error(e.value)}catch(n){setTimeout(function(){throw n})}}var JA=typeof WeakMap=="function"?WeakMap:Map;function VT(t,e,n){n=Qn(-1,n),n.tag=3,n.payload={element:null};var r=e.value;return n.callback=function(){Wu||(Wu=!0,Tf=r),df(t,e)},n}function FT(t,e,n){n=Qn(-1,n),n.tag=3;var r=t.type.getDerivedStateFromError;if(typeof r=="function"){var i=e.value;n.payload=function(){return r(i)},n.callback=function(){df(t,e)}}var s=t.stateNode;return s!==null&&typeof s.componentDidCatch=="function"&&(n.callback=function(){df(t,e),typeof r!="function"&&(br===null?br=new Set([this]):br.add(this));var o=e.stack;this.componentDidCatch(e.value,{componentStack:o!==null?o:""})}),n}function xy(t,e,n){var r=t.pingCache;if(r===null){r=t.pingCache=new JA;var i=new Set;r.set(e,i)}else i=r.get(e),i===void 0&&(i=new Set,r.set(e,i));i.has(n)||(i.add(n),t=dN.bind(null,t,e,n),e.then(t,t))}function by(t){do{var e;if((e=t.tag===13)&&(e=t.memoizedState,e=e!==null?e.dehydrated!==null:!0),e)return t;t=t.return}while(t!==null);return null}function Dy(t,e,n,r,i){return t.mode&1?(t.flags|=65536,t.lanes=i,t):(t===e?t.flags|=65536:(t.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(e=Qn(-1,1),e.tag=2,xr(n,e,1))),n.lanes|=1),t)}var ZA=lr.ReactCurrentOwner,Pt=!1;function It(t,e,n,r){e.child=t===null?fT(e,null,n,r):Is(e,t.child,n,r)}function My(t,e,n,r,i){n=n.render;var s=e.ref;return hs(e,i),r=qp(t,e,n,r,s,i),n=Gp(),t!==null&&!Pt?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~i,tr(t,e,i)):(ke&&n&&Mp(e),e.flags|=1,It(t,e,r,i),e.child)}function Oy(t,e,n,r,i){if(t===null){var s=n.type;return typeof s=="function"&&!rm(s)&&s.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(e.tag=15,e.type=s,jT(t,e,s,r,i)):(t=du(n.type,null,r,e,e.mode,i),t.ref=e.ref,t.return=e,e.child=t)}if(s=t.child,!(t.lanes&i)){var o=s.memoizedProps;if(n=n.compare,n=n!==null?n:da,n(o,r)&&t.ref===e.ref)return tr(t,e,i)}return e.flags|=1,t=Mr(s,r),t.ref=e.ref,t.return=e,e.child=t}function jT(t,e,n,r,i){if(t!==null){var s=t.memoizedProps;if(da(s,r)&&t.ref===e.ref)if(Pt=!1,e.pendingProps=r=s,(t.lanes&i)!==0)t.flags&131072&&(Pt=!0);else return e.lanes=t.lanes,tr(t,e,i)}return ff(t,e,n,r,i)}function UT(t,e,n){var r=e.pendingProps,i=r.children,s=t!==null?t.memoizedState:null;if(r.mode==="hidden")if(!(e.mode&1))e.memoizedState={baseLanes:0,cachePool:null,transitions:null},Ee(ss,jt),jt|=n;else{if(!(n&1073741824))return t=s!==null?s.baseLanes|n:n,e.lanes=e.childLanes=1073741824,e.memoizedState={baseLanes:t,cachePool:null,transitions:null},e.updateQueue=null,Ee(ss,jt),jt|=t,null;e.memoizedState={baseLanes:0,cachePool:null,transitions:null},r=s!==null?s.baseLanes:n,Ee(ss,jt),jt|=r}else s!==null?(r=s.baseLanes|n,e.memoizedState=null):r=n,Ee(ss,jt),jt|=r;return It(t,e,i,n),e.child}function $T(t,e){var n=e.ref;(t===null&&n!==null||t!==null&&t.ref!==n)&&(e.flags|=512,e.flags|=2097152)}function ff(t,e,n,r,i){var s=bt(n)?vi:vt.current;return s=Es(e,s),hs(e,i),n=qp(t,e,n,r,s,i),r=Gp(),t!==null&&!Pt?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~i,tr(t,e,i)):(ke&&r&&Mp(e),e.flags|=1,It(t,e,n,i),e.child)}function Ly(t,e,n,r,i){if(bt(n)){var s=!0;Mu(e)}else s=!1;if(hs(e,i),e.stateNode===null)uu(t,e),LT(e,n,r),hf(e,n,r,i),r=!0;else if(t===null){var o=e.stateNode,l=e.memoizedProps;o.props=l;var u=o.context,c=n.contextType;typeof c=="object"&&c!==null?c=Jt(c):(c=bt(n)?vi:vt.current,c=Es(e,c));var d=n.getDerivedStateFromProps,p=typeof d=="function"||typeof o.getSnapshotBeforeUpdate=="function";p||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(l!==r||u!==c)&&Py(e,o,r,c),yr=!1;var m=e.memoizedState;o.state=m,ju(e,r,o,i),u=e.memoizedState,l!==r||m!==u||xt.current||yr?(typeof d=="function"&&(cf(e,n,d,r),u=e.memoizedState),(l=yr||Ny(e,n,l,r,m,u,c))?(p||typeof o.UNSAFE_componentWillMount!="function"&&typeof o.componentWillMount!="function"||(typeof o.componentWillMount=="function"&&o.componentWillMount(),typeof o.UNSAFE_componentWillMount=="function"&&o.UNSAFE_componentWillMount()),typeof o.componentDidMount=="function"&&(e.flags|=4194308)):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),e.memoizedProps=r,e.memoizedState=u),o.props=r,o.state=u,o.context=c,r=l):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),r=!1)}else{o=e.stateNode,mT(t,e),l=e.memoizedProps,c=e.type===e.elementType?l:nn(e.type,l),o.props=c,p=e.pendingProps,m=o.context,u=n.contextType,typeof u=="object"&&u!==null?u=Jt(u):(u=bt(n)?vi:vt.current,u=Es(e,u));var E=n.getDerivedStateFromProps;(d=typeof E=="function"||typeof o.getSnapshotBeforeUpdate=="function")||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(l!==p||m!==u)&&Py(e,o,r,u),yr=!1,m=e.memoizedState,o.state=m,ju(e,r,o,i);var k=e.memoizedState;l!==p||m!==k||xt.current||yr?(typeof E=="function"&&(cf(e,n,E,r),k=e.memoizedState),(c=yr||Ny(e,n,c,r,m,k,u)||!1)?(d||typeof o.UNSAFE_componentWillUpdate!="function"&&typeof o.componentWillUpdate!="function"||(typeof o.componentWillUpdate=="function"&&o.componentWillUpdate(r,k,u),typeof o.UNSAFE_componentWillUpdate=="function"&&o.UNSAFE_componentWillUpdate(r,k,u)),typeof o.componentDidUpdate=="function"&&(e.flags|=4),typeof o.getSnapshotBeforeUpdate=="function"&&(e.flags|=1024)):(typeof o.componentDidUpdate!="function"||l===t.memoizedProps&&m===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||l===t.memoizedProps&&m===t.memoizedState||(e.flags|=1024),e.memoizedProps=r,e.memoizedState=k),o.props=r,o.state=k,o.context=u,r=c):(typeof o.componentDidUpdate!="function"||l===t.memoizedProps&&m===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||l===t.memoizedProps&&m===t.memoizedState||(e.flags|=1024),r=!1)}return pf(t,e,n,r,s,i)}function pf(t,e,n,r,i,s){$T(t,e);var o=(e.flags&128)!==0;if(!r&&!o)return i&&Ey(e,n,!1),tr(t,e,s);r=e.stateNode,ZA.current=e;var l=o&&typeof n.getDerivedStateFromError!="function"?null:r.render();return e.flags|=1,t!==null&&o?(e.child=Is(e,t.child,null,s),e.child=Is(e,null,l,s)):It(t,e,l,s),e.memoizedState=r.state,i&&Ey(e,n,!0),e.child}function BT(t){var e=t.stateNode;e.pendingContext?wy(t,e.pendingContext,e.pendingContext!==e.context):e.context&&wy(t,e.context,!1),Bp(t,e.containerInfo)}function Vy(t,e,n,r,i){return Ts(),Lp(i),e.flags|=256,It(t,e,n,r),e.child}var mf={dehydrated:null,treeContext:null,retryLane:0};function gf(t){return{baseLanes:t,cachePool:null,transitions:null}}function zT(t,e,n){var r=e.pendingProps,i=Ae.current,s=!1,o=(e.flags&128)!==0,l;if((l=o)||(l=t!==null&&t.memoizedState===null?!1:(i&2)!==0),l?(s=!0,e.flags&=-129):(t===null||t.memoizedState!==null)&&(i|=1),Ee(Ae,i&1),t===null)return lf(e),t=e.memoizedState,t!==null&&(t=t.dehydrated,t!==null)?(e.mode&1?t.data==="$!"?e.lanes=8:e.lanes=1073741824:e.lanes=1,null):(o=r.children,t=r.fallback,s?(r=e.mode,s=e.child,o={mode:"hidden",children:o},!(r&1)&&s!==null?(s.childLanes=0,s.pendingProps=o):s=Fc(o,r,0,null),t=gi(t,r,n,null),s.return=e,t.return=e,s.sibling=t,e.child=s,e.child.memoizedState=gf(n),e.memoizedState=mf,t):Yp(e,o));if(i=t.memoizedState,i!==null&&(l=i.dehydrated,l!==null))return eN(t,e,o,r,l,i,n);if(s){s=r.fallback,o=e.mode,i=t.child,l=i.sibling;var u={mode:"hidden",children:r.children};return!(o&1)&&e.child!==i?(r=e.child,r.childLanes=0,r.pendingProps=u,e.deletions=null):(r=Mr(i,u),r.subtreeFlags=i.subtreeFlags&14680064),l!==null?s=Mr(l,s):(s=gi(s,o,n,null),s.flags|=2),s.return=e,r.return=e,r.sibling=s,e.child=r,r=s,s=e.child,o=t.child.memoizedState,o=o===null?gf(n):{baseLanes:o.baseLanes|n,cachePool:null,transitions:o.transitions},s.memoizedState=o,s.childLanes=t.childLanes&~n,e.memoizedState=mf,r}return s=t.child,t=s.sibling,r=Mr(s,{mode:"visible",children:r.children}),!(e.mode&1)&&(r.lanes=n),r.return=e,r.sibling=null,t!==null&&(n=e.deletions,n===null?(e.deletions=[t],e.flags|=16):n.push(t)),e.child=r,e.memoizedState=null,r}function Yp(t,e){return e=Fc({mode:"visible",children:e},t.mode,0,null),e.return=t,t.child=e}function Wl(t,e,n,r){return r!==null&&Lp(r),Is(e,t.child,null,n),t=Yp(e,e.pendingProps.children),t.flags|=2,e.memoizedState=null,t}function eN(t,e,n,r,i,s,o){if(n)return e.flags&256?(e.flags&=-257,r=cd(Error(F(422))),Wl(t,e,o,r)):e.memoizedState!==null?(e.child=t.child,e.flags|=128,null):(s=r.fallback,i=e.mode,r=Fc({mode:"visible",children:r.children},i,0,null),s=gi(s,i,o,null),s.flags|=2,r.return=e,s.return=e,r.sibling=s,e.child=r,e.mode&1&&Is(e,t.child,null,o),e.child.memoizedState=gf(o),e.memoizedState=mf,s);if(!(e.mode&1))return Wl(t,e,o,null);if(i.data==="$!"){if(r=i.nextSibling&&i.nextSibling.dataset,r)var l=r.dgst;return r=l,s=Error(F(419)),r=cd(s,r,void 0),Wl(t,e,o,r)}if(l=(o&t.childLanes)!==0,Pt||l){if(r=Xe,r!==null){switch(o&-o){case 4:i=2;break;case 16:i=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:i=32;break;case 536870912:i=268435456;break;default:i=0}i=i&(r.suspendedLanes|o)?0:i,i!==0&&i!==s.retryLane&&(s.retryLane=i,er(t,i),hn(r,t,i,-1))}return nm(),r=cd(Error(F(421))),Wl(t,e,o,r)}return i.data==="$?"?(e.flags|=128,e.child=t.child,e=fN.bind(null,t),i._reactRetry=e,null):(t=s.treeContext,$t=Pr(i.nextSibling),Bt=e,ke=!0,sn=null,t!==null&&(qt[Gt++]=zn,qt[Gt++]=Wn,qt[Gt++]=wi,zn=t.id,Wn=t.overflow,wi=e),e=Yp(e,r.children),e.flags|=4096,e)}function Fy(t,e,n){t.lanes|=e;var r=t.alternate;r!==null&&(r.lanes|=e),uf(t.return,e,n)}function hd(t,e,n,r,i){var s=t.memoizedState;s===null?t.memoizedState={isBackwards:e,rendering:null,renderingStartTime:0,last:r,tail:n,tailMode:i}:(s.isBackwards=e,s.rendering=null,s.renderingStartTime=0,s.last=r,s.tail=n,s.tailMode=i)}function WT(t,e,n){var r=e.pendingProps,i=r.revealOrder,s=r.tail;if(It(t,e,r.children,n),r=Ae.current,r&2)r=r&1|2,e.flags|=128;else{if(t!==null&&t.flags&128)e:for(t=e.child;t!==null;){if(t.tag===13)t.memoizedState!==null&&Fy(t,n,e);else if(t.tag===19)Fy(t,n,e);else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break e;for(;t.sibling===null;){if(t.return===null||t.return===e)break e;t=t.return}t.sibling.return=t.return,t=t.sibling}r&=1}if(Ee(Ae,r),!(e.mode&1))e.memoizedState=null;else switch(i){case"forwards":for(n=e.child,i=null;n!==null;)t=n.alternate,t!==null&&Uu(t)===null&&(i=n),n=n.sibling;n=i,n===null?(i=e.child,e.child=null):(i=n.sibling,n.sibling=null),hd(e,!1,i,n,s);break;case"backwards":for(n=null,i=e.child,e.child=null;i!==null;){if(t=i.alternate,t!==null&&Uu(t)===null){e.child=i;break}t=i.sibling,i.sibling=n,n=i,i=t}hd(e,!0,n,null,s);break;case"together":hd(e,!1,null,null,void 0);break;default:e.memoizedState=null}return e.child}function uu(t,e){!(e.mode&1)&&t!==null&&(t.alternate=null,e.alternate=null,e.flags|=2)}function tr(t,e,n){if(t!==null&&(e.dependencies=t.dependencies),Ti|=e.lanes,!(n&e.childLanes))return null;if(t!==null&&e.child!==t.child)throw Error(F(153));if(e.child!==null){for(t=e.child,n=Mr(t,t.pendingProps),e.child=n,n.return=e;t.sibling!==null;)t=t.sibling,n=n.sibling=Mr(t,t.pendingProps),n.return=e;n.sibling=null}return e.child}function tN(t,e,n){switch(e.tag){case 3:BT(e),Ts();break;case 5:gT(e);break;case 1:bt(e.type)&&Mu(e);break;case 4:Bp(e,e.stateNode.containerInfo);break;case 10:var r=e.type._context,i=e.memoizedProps.value;Ee(Vu,r._currentValue),r._currentValue=i;break;case 13:if(r=e.memoizedState,r!==null)return r.dehydrated!==null?(Ee(Ae,Ae.current&1),e.flags|=128,null):n&e.child.childLanes?zT(t,e,n):(Ee(Ae,Ae.current&1),t=tr(t,e,n),t!==null?t.sibling:null);Ee(Ae,Ae.current&1);break;case 19:if(r=(n&e.childLanes)!==0,t.flags&128){if(r)return WT(t,e,n);e.flags|=128}if(i=e.memoizedState,i!==null&&(i.rendering=null,i.tail=null,i.lastEffect=null),Ee(Ae,Ae.current),r)break;return null;case 22:case 23:return e.lanes=0,UT(t,e,n)}return tr(t,e,n)}var HT,_f,qT,GT;HT=function(t,e){for(var n=e.child;n!==null;){if(n.tag===5||n.tag===6)t.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===e)break;for(;n.sibling===null;){if(n.return===null||n.return===e)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};_f=function(){};qT=function(t,e,n,r){var i=t.memoizedProps;if(i!==r){t=e.stateNode,ci(In.current);var s=null;switch(n){case"input":i=Fd(t,i),r=Fd(t,r),s=[];break;case"select":i=Pe({},i,{value:void 0}),r=Pe({},r,{value:void 0}),s=[];break;case"textarea":i=$d(t,i),r=$d(t,r),s=[];break;default:typeof i.onClick!="function"&&typeof r.onClick=="function"&&(t.onclick=bu)}zd(n,r);var o;n=null;for(c in i)if(!r.hasOwnProperty(c)&&i.hasOwnProperty(c)&&i[c]!=null)if(c==="style"){var l=i[c];for(o in l)l.hasOwnProperty(o)&&(n||(n={}),n[o]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(sa.hasOwnProperty(c)?s||(s=[]):(s=s||[]).push(c,null));for(c in r){var u=r[c];if(l=i!=null?i[c]:void 0,r.hasOwnProperty(c)&&u!==l&&(u!=null||l!=null))if(c==="style")if(l){for(o in l)!l.hasOwnProperty(o)||u&&u.hasOwnProperty(o)||(n||(n={}),n[o]="");for(o in u)u.hasOwnProperty(o)&&l[o]!==u[o]&&(n||(n={}),n[o]=u[o])}else n||(s||(s=[]),s.push(c,n)),n=u;else c==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,l=l?l.__html:void 0,u!=null&&l!==u&&(s=s||[]).push(c,u)):c==="children"?typeof u!="string"&&typeof u!="number"||(s=s||[]).push(c,""+u):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(sa.hasOwnProperty(c)?(u!=null&&c==="onScroll"&&Ie("scroll",t),s||l===u||(s=[])):(s=s||[]).push(c,u))}n&&(s=s||[]).push("style",n);var c=s;(e.updateQueue=c)&&(e.flags|=4)}};GT=function(t,e,n,r){n!==r&&(e.flags|=4)};function To(t,e){if(!ke)switch(t.tailMode){case"hidden":e=t.tail;for(var n=null;e!==null;)e.alternate!==null&&(n=e),e=e.sibling;n===null?t.tail=null:n.sibling=null;break;case"collapsed":n=t.tail;for(var r=null;n!==null;)n.alternate!==null&&(r=n),n=n.sibling;r===null?e||t.tail===null?t.tail=null:t.tail.sibling=null:r.sibling=null}}function dt(t){var e=t.alternate!==null&&t.alternate.child===t.child,n=0,r=0;if(e)for(var i=t.child;i!==null;)n|=i.lanes|i.childLanes,r|=i.subtreeFlags&14680064,r|=i.flags&14680064,i.return=t,i=i.sibling;else for(i=t.child;i!==null;)n|=i.lanes|i.childLanes,r|=i.subtreeFlags,r|=i.flags,i.return=t,i=i.sibling;return t.subtreeFlags|=r,t.childLanes=n,e}function nN(t,e,n){var r=e.pendingProps;switch(Op(e),e.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return dt(e),null;case 1:return bt(e.type)&&Du(),dt(e),null;case 3:return r=e.stateNode,Ss(),Ce(xt),Ce(vt),Wp(),r.pendingContext&&(r.context=r.pendingContext,r.pendingContext=null),(t===null||t.child===null)&&(Bl(e)?e.flags|=4:t===null||t.memoizedState.isDehydrated&&!(e.flags&256)||(e.flags|=1024,sn!==null&&(Cf(sn),sn=null))),_f(t,e),dt(e),null;case 5:zp(e);var i=ci(_a.current);if(n=e.type,t!==null&&e.stateNode!=null)qT(t,e,n,r,i),t.ref!==e.ref&&(e.flags|=512,e.flags|=2097152);else{if(!r){if(e.stateNode===null)throw Error(F(166));return dt(e),null}if(t=ci(In.current),Bl(e)){r=e.stateNode,n=e.type;var s=e.memoizedProps;switch(r[yn]=e,r[ma]=s,t=(e.mode&1)!==0,n){case"dialog":Ie("cancel",r),Ie("close",r);break;case"iframe":case"object":case"embed":Ie("load",r);break;case"video":case"audio":for(i=0;i<bo.length;i++)Ie(bo[i],r);break;case"source":Ie("error",r);break;case"img":case"image":case"link":Ie("error",r),Ie("load",r);break;case"details":Ie("toggle",r);break;case"input":G_(r,s),Ie("invalid",r);break;case"select":r._wrapperState={wasMultiple:!!s.multiple},Ie("invalid",r);break;case"textarea":Q_(r,s),Ie("invalid",r)}zd(n,s),i=null;for(var o in s)if(s.hasOwnProperty(o)){var l=s[o];o==="children"?typeof l=="string"?r.textContent!==l&&(s.suppressHydrationWarning!==!0&&$l(r.textContent,l,t),i=["children",l]):typeof l=="number"&&r.textContent!==""+l&&(s.suppressHydrationWarning!==!0&&$l(r.textContent,l,t),i=["children",""+l]):sa.hasOwnProperty(o)&&l!=null&&o==="onScroll"&&Ie("scroll",r)}switch(n){case"input":Dl(r),K_(r,s,!0);break;case"textarea":Dl(r),Y_(r);break;case"select":case"option":break;default:typeof s.onClick=="function"&&(r.onclick=bu)}r=i,e.updateQueue=r,r!==null&&(e.flags|=4)}else{o=i.nodeType===9?i:i.ownerDocument,t==="http://www.w3.org/1999/xhtml"&&(t=EE(n)),t==="http://www.w3.org/1999/xhtml"?n==="script"?(t=o.createElement("div"),t.innerHTML="<script><\/script>",t=t.removeChild(t.firstChild)):typeof r.is=="string"?t=o.createElement(n,{is:r.is}):(t=o.createElement(n),n==="select"&&(o=t,r.multiple?o.multiple=!0:r.size&&(o.size=r.size))):t=o.createElementNS(t,n),t[yn]=e,t[ma]=r,HT(t,e,!1,!1),e.stateNode=t;e:{switch(o=Wd(n,r),n){case"dialog":Ie("cancel",t),Ie("close",t),i=r;break;case"iframe":case"object":case"embed":Ie("load",t),i=r;break;case"video":case"audio":for(i=0;i<bo.length;i++)Ie(bo[i],t);i=r;break;case"source":Ie("error",t),i=r;break;case"img":case"image":case"link":Ie("error",t),Ie("load",t),i=r;break;case"details":Ie("toggle",t),i=r;break;case"input":G_(t,r),i=Fd(t,r),Ie("invalid",t);break;case"option":i=r;break;case"select":t._wrapperState={wasMultiple:!!r.multiple},i=Pe({},r,{value:void 0}),Ie("invalid",t);break;case"textarea":Q_(t,r),i=$d(t,r),Ie("invalid",t);break;default:i=r}zd(n,i),l=i;for(s in l)if(l.hasOwnProperty(s)){var u=l[s];s==="style"?SE(t,u):s==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,u!=null&&TE(t,u)):s==="children"?typeof u=="string"?(n!=="textarea"||u!=="")&&oa(t,u):typeof u=="number"&&oa(t,""+u):s!=="suppressContentEditableWarning"&&s!=="suppressHydrationWarning"&&s!=="autoFocus"&&(sa.hasOwnProperty(s)?u!=null&&s==="onScroll"&&Ie("scroll",t):u!=null&&wp(t,s,u,o))}switch(n){case"input":Dl(t),K_(t,r,!1);break;case"textarea":Dl(t),Y_(t);break;case"option":r.value!=null&&t.setAttribute("value",""+$r(r.value));break;case"select":t.multiple=!!r.multiple,s=r.value,s!=null?as(t,!!r.multiple,s,!1):r.defaultValue!=null&&as(t,!!r.multiple,r.defaultValue,!0);break;default:typeof i.onClick=="function"&&(t.onclick=bu)}switch(n){case"button":case"input":case"select":case"textarea":r=!!r.autoFocus;break e;case"img":r=!0;break e;default:r=!1}}r&&(e.flags|=4)}e.ref!==null&&(e.flags|=512,e.flags|=2097152)}return dt(e),null;case 6:if(t&&e.stateNode!=null)GT(t,e,t.memoizedProps,r);else{if(typeof r!="string"&&e.stateNode===null)throw Error(F(166));if(n=ci(_a.current),ci(In.current),Bl(e)){if(r=e.stateNode,n=e.memoizedProps,r[yn]=e,(s=r.nodeValue!==n)&&(t=Bt,t!==null))switch(t.tag){case 3:$l(r.nodeValue,n,(t.mode&1)!==0);break;case 5:t.memoizedProps.suppressHydrationWarning!==!0&&$l(r.nodeValue,n,(t.mode&1)!==0)}s&&(e.flags|=4)}else r=(n.nodeType===9?n:n.ownerDocument).createTextNode(r),r[yn]=e,e.stateNode=r}return dt(e),null;case 13:if(Ce(Ae),r=e.memoizedState,t===null||t.memoizedState!==null&&t.memoizedState.dehydrated!==null){if(ke&&$t!==null&&e.mode&1&&!(e.flags&128))hT(),Ts(),e.flags|=98560,s=!1;else if(s=Bl(e),r!==null&&r.dehydrated!==null){if(t===null){if(!s)throw Error(F(318));if(s=e.memoizedState,s=s!==null?s.dehydrated:null,!s)throw Error(F(317));s[yn]=e}else Ts(),!(e.flags&128)&&(e.memoizedState=null),e.flags|=4;dt(e),s=!1}else sn!==null&&(Cf(sn),sn=null),s=!0;if(!s)return e.flags&65536?e:null}return e.flags&128?(e.lanes=n,e):(r=r!==null,r!==(t!==null&&t.memoizedState!==null)&&r&&(e.child.flags|=8192,e.mode&1&&(t===null||Ae.current&1?He===0&&(He=3):nm())),e.updateQueue!==null&&(e.flags|=4),dt(e),null);case 4:return Ss(),_f(t,e),t===null&&fa(e.stateNode.containerInfo),dt(e),null;case 10:return jp(e.type._context),dt(e),null;case 17:return bt(e.type)&&Du(),dt(e),null;case 19:if(Ce(Ae),s=e.memoizedState,s===null)return dt(e),null;if(r=(e.flags&128)!==0,o=s.rendering,o===null)if(r)To(s,!1);else{if(He!==0||t!==null&&t.flags&128)for(t=e.child;t!==null;){if(o=Uu(t),o!==null){for(e.flags|=128,To(s,!1),r=o.updateQueue,r!==null&&(e.updateQueue=r,e.flags|=4),e.subtreeFlags=0,r=n,n=e.child;n!==null;)s=n,t=r,s.flags&=14680066,o=s.alternate,o===null?(s.childLanes=0,s.lanes=t,s.child=null,s.subtreeFlags=0,s.memoizedProps=null,s.memoizedState=null,s.updateQueue=null,s.dependencies=null,s.stateNode=null):(s.childLanes=o.childLanes,s.lanes=o.lanes,s.child=o.child,s.subtreeFlags=0,s.deletions=null,s.memoizedProps=o.memoizedProps,s.memoizedState=o.memoizedState,s.updateQueue=o.updateQueue,s.type=o.type,t=o.dependencies,s.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext}),n=n.sibling;return Ee(Ae,Ae.current&1|2),e.child}t=t.sibling}s.tail!==null&&Fe()>ks&&(e.flags|=128,r=!0,To(s,!1),e.lanes=4194304)}else{if(!r)if(t=Uu(o),t!==null){if(e.flags|=128,r=!0,n=t.updateQueue,n!==null&&(e.updateQueue=n,e.flags|=4),To(s,!0),s.tail===null&&s.tailMode==="hidden"&&!o.alternate&&!ke)return dt(e),null}else 2*Fe()-s.renderingStartTime>ks&&n!==1073741824&&(e.flags|=128,r=!0,To(s,!1),e.lanes=4194304);s.isBackwards?(o.sibling=e.child,e.child=o):(n=s.last,n!==null?n.sibling=o:e.child=o,s.last=o)}return s.tail!==null?(e=s.tail,s.rendering=e,s.tail=e.sibling,s.renderingStartTime=Fe(),e.sibling=null,n=Ae.current,Ee(Ae,r?n&1|2:n&1),e):(dt(e),null);case 22:case 23:return tm(),r=e.memoizedState!==null,t!==null&&t.memoizedState!==null!==r&&(e.flags|=8192),r&&e.mode&1?jt&1073741824&&(dt(e),e.subtreeFlags&6&&(e.flags|=8192)):dt(e),null;case 24:return null;case 25:return null}throw Error(F(156,e.tag))}function rN(t,e){switch(Op(e),e.tag){case 1:return bt(e.type)&&Du(),t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 3:return Ss(),Ce(xt),Ce(vt),Wp(),t=e.flags,t&65536&&!(t&128)?(e.flags=t&-65537|128,e):null;case 5:return zp(e),null;case 13:if(Ce(Ae),t=e.memoizedState,t!==null&&t.dehydrated!==null){if(e.alternate===null)throw Error(F(340));Ts()}return t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 19:return Ce(Ae),null;case 4:return Ss(),null;case 10:return jp(e.type._context),null;case 22:case 23:return tm(),null;case 24:return null;default:return null}}var Hl=!1,mt=!1,iN=typeof WeakSet=="function"?WeakSet:Set,W=null;function is(t,e){var n=t.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(r){De(t,e,r)}else n.current=null}function yf(t,e,n){try{n()}catch(r){De(t,e,r)}}var jy=!1;function sN(t,e){if(ef=Nu,t=JE(),Dp(t)){if("selectionStart"in t)var n={start:t.selectionStart,end:t.selectionEnd};else e:{n=(n=t.ownerDocument)&&n.defaultView||window;var r=n.getSelection&&n.getSelection();if(r&&r.rangeCount!==0){n=r.anchorNode;var i=r.anchorOffset,s=r.focusNode;r=r.focusOffset;try{n.nodeType,s.nodeType}catch{n=null;break e}var o=0,l=-1,u=-1,c=0,d=0,p=t,m=null;t:for(;;){for(var E;p!==n||i!==0&&p.nodeType!==3||(l=o+i),p!==s||r!==0&&p.nodeType!==3||(u=o+r),p.nodeType===3&&(o+=p.nodeValue.length),(E=p.firstChild)!==null;)m=p,p=E;for(;;){if(p===t)break t;if(m===n&&++c===i&&(l=o),m===s&&++d===r&&(u=o),(E=p.nextSibling)!==null)break;p=m,m=p.parentNode}p=E}n=l===-1||u===-1?null:{start:l,end:u}}else n=null}n=n||{start:0,end:0}}else n=null;for(tf={focusedElem:t,selectionRange:n},Nu=!1,W=e;W!==null;)if(e=W,t=e.child,(e.subtreeFlags&1028)!==0&&t!==null)t.return=e,W=t;else for(;W!==null;){e=W;try{var k=e.alternate;if(e.flags&1024)switch(e.tag){case 0:case 11:case 15:break;case 1:if(k!==null){var x=k.memoizedProps,P=k.memoizedState,S=e.stateNode,w=S.getSnapshotBeforeUpdate(e.elementType===e.type?x:nn(e.type,x),P);S.__reactInternalSnapshotBeforeUpdate=w}break;case 3:var R=e.stateNode.containerInfo;R.nodeType===1?R.textContent="":R.nodeType===9&&R.documentElement&&R.removeChild(R.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(F(163))}}catch(D){De(e,e.return,D)}if(t=e.sibling,t!==null){t.return=e.return,W=t;break}W=e.return}return k=jy,jy=!1,k}function zo(t,e,n){var r=e.updateQueue;if(r=r!==null?r.lastEffect:null,r!==null){var i=r=r.next;do{if((i.tag&t)===t){var s=i.destroy;i.destroy=void 0,s!==void 0&&yf(e,n,s)}i=i.next}while(i!==r)}}function Lc(t,e){if(e=e.updateQueue,e=e!==null?e.lastEffect:null,e!==null){var n=e=e.next;do{if((n.tag&t)===t){var r=n.create;n.destroy=r()}n=n.next}while(n!==e)}}function vf(t){var e=t.ref;if(e!==null){var n=t.stateNode;switch(t.tag){case 5:t=n;break;default:t=n}typeof e=="function"?e(t):e.current=t}}function KT(t){var e=t.alternate;e!==null&&(t.alternate=null,KT(e)),t.child=null,t.deletions=null,t.sibling=null,t.tag===5&&(e=t.stateNode,e!==null&&(delete e[yn],delete e[ma],delete e[sf],delete e[$A],delete e[BA])),t.stateNode=null,t.return=null,t.dependencies=null,t.memoizedProps=null,t.memoizedState=null,t.pendingProps=null,t.stateNode=null,t.updateQueue=null}function QT(t){return t.tag===5||t.tag===3||t.tag===4}function Uy(t){e:for(;;){for(;t.sibling===null;){if(t.return===null||QT(t.return))return null;t=t.return}for(t.sibling.return=t.return,t=t.sibling;t.tag!==5&&t.tag!==6&&t.tag!==18;){if(t.flags&2||t.child===null||t.tag===4)continue e;t.child.return=t,t=t.child}if(!(t.flags&2))return t.stateNode}}function wf(t,e,n){var r=t.tag;if(r===5||r===6)t=t.stateNode,e?n.nodeType===8?n.parentNode.insertBefore(t,e):n.insertBefore(t,e):(n.nodeType===8?(e=n.parentNode,e.insertBefore(t,n)):(e=n,e.appendChild(t)),n=n._reactRootContainer,n!=null||e.onclick!==null||(e.onclick=bu));else if(r!==4&&(t=t.child,t!==null))for(wf(t,e,n),t=t.sibling;t!==null;)wf(t,e,n),t=t.sibling}function Ef(t,e,n){var r=t.tag;if(r===5||r===6)t=t.stateNode,e?n.insertBefore(t,e):n.appendChild(t);else if(r!==4&&(t=t.child,t!==null))for(Ef(t,e,n),t=t.sibling;t!==null;)Ef(t,e,n),t=t.sibling}var et=null,rn=!1;function mr(t,e,n){for(n=n.child;n!==null;)YT(t,e,n),n=n.sibling}function YT(t,e,n){if(Tn&&typeof Tn.onCommitFiberUnmount=="function")try{Tn.onCommitFiberUnmount(Ac,n)}catch{}switch(n.tag){case 5:mt||is(n,e);case 6:var r=et,i=rn;et=null,mr(t,e,n),et=r,rn=i,et!==null&&(rn?(t=et,n=n.stateNode,t.nodeType===8?t.parentNode.removeChild(n):t.removeChild(n)):et.removeChild(n.stateNode));break;case 18:et!==null&&(rn?(t=et,n=n.stateNode,t.nodeType===8?id(t.parentNode,n):t.nodeType===1&&id(t,n),ca(t)):id(et,n.stateNode));break;case 4:r=et,i=rn,et=n.stateNode.containerInfo,rn=!0,mr(t,e,n),et=r,rn=i;break;case 0:case 11:case 14:case 15:if(!mt&&(r=n.updateQueue,r!==null&&(r=r.lastEffect,r!==null))){i=r=r.next;do{var s=i,o=s.destroy;s=s.tag,o!==void 0&&(s&2||s&4)&&yf(n,e,o),i=i.next}while(i!==r)}mr(t,e,n);break;case 1:if(!mt&&(is(n,e),r=n.stateNode,typeof r.componentWillUnmount=="function"))try{r.props=n.memoizedProps,r.state=n.memoizedState,r.componentWillUnmount()}catch(l){De(n,e,l)}mr(t,e,n);break;case 21:mr(t,e,n);break;case 22:n.mode&1?(mt=(r=mt)||n.memoizedState!==null,mr(t,e,n),mt=r):mr(t,e,n);break;default:mr(t,e,n)}}function $y(t){var e=t.updateQueue;if(e!==null){t.updateQueue=null;var n=t.stateNode;n===null&&(n=t.stateNode=new iN),e.forEach(function(r){var i=pN.bind(null,t,r);n.has(r)||(n.add(r),r.then(i,i))})}}function tn(t,e){var n=e.deletions;if(n!==null)for(var r=0;r<n.length;r++){var i=n[r];try{var s=t,o=e,l=o;e:for(;l!==null;){switch(l.tag){case 5:et=l.stateNode,rn=!1;break e;case 3:et=l.stateNode.containerInfo,rn=!0;break e;case 4:et=l.stateNode.containerInfo,rn=!0;break e}l=l.return}if(et===null)throw Error(F(160));YT(s,o,i),et=null,rn=!1;var u=i.alternate;u!==null&&(u.return=null),i.return=null}catch(c){De(i,e,c)}}if(e.subtreeFlags&12854)for(e=e.child;e!==null;)XT(e,t),e=e.sibling}function XT(t,e){var n=t.alternate,r=t.flags;switch(t.tag){case 0:case 11:case 14:case 15:if(tn(e,t),gn(t),r&4){try{zo(3,t,t.return),Lc(3,t)}catch(x){De(t,t.return,x)}try{zo(5,t,t.return)}catch(x){De(t,t.return,x)}}break;case 1:tn(e,t),gn(t),r&512&&n!==null&&is(n,n.return);break;case 5:if(tn(e,t),gn(t),r&512&&n!==null&&is(n,n.return),t.flags&32){var i=t.stateNode;try{oa(i,"")}catch(x){De(t,t.return,x)}}if(r&4&&(i=t.stateNode,i!=null)){var s=t.memoizedProps,o=n!==null?n.memoizedProps:s,l=t.type,u=t.updateQueue;if(t.updateQueue=null,u!==null)try{l==="input"&&s.type==="radio"&&s.name!=null&&vE(i,s),Wd(l,o);var c=Wd(l,s);for(o=0;o<u.length;o+=2){var d=u[o],p=u[o+1];d==="style"?SE(i,p):d==="dangerouslySetInnerHTML"?TE(i,p):d==="children"?oa(i,p):wp(i,d,p,c)}switch(l){case"input":jd(i,s);break;case"textarea":wE(i,s);break;case"select":var m=i._wrapperState.wasMultiple;i._wrapperState.wasMultiple=!!s.multiple;var E=s.value;E!=null?as(i,!!s.multiple,E,!1):m!==!!s.multiple&&(s.defaultValue!=null?as(i,!!s.multiple,s.defaultValue,!0):as(i,!!s.multiple,s.multiple?[]:"",!1))}i[ma]=s}catch(x){De(t,t.return,x)}}break;case 6:if(tn(e,t),gn(t),r&4){if(t.stateNode===null)throw Error(F(162));i=t.stateNode,s=t.memoizedProps;try{i.nodeValue=s}catch(x){De(t,t.return,x)}}break;case 3:if(tn(e,t),gn(t),r&4&&n!==null&&n.memoizedState.isDehydrated)try{ca(e.containerInfo)}catch(x){De(t,t.return,x)}break;case 4:tn(e,t),gn(t);break;case 13:tn(e,t),gn(t),i=t.child,i.flags&8192&&(s=i.memoizedState!==null,i.stateNode.isHidden=s,!s||i.alternate!==null&&i.alternate.memoizedState!==null||(Zp=Fe())),r&4&&$y(t);break;case 22:if(d=n!==null&&n.memoizedState!==null,t.mode&1?(mt=(c=mt)||d,tn(e,t),mt=c):tn(e,t),gn(t),r&8192){if(c=t.memoizedState!==null,(t.stateNode.isHidden=c)&&!d&&t.mode&1)for(W=t,d=t.child;d!==null;){for(p=W=d;W!==null;){switch(m=W,E=m.child,m.tag){case 0:case 11:case 14:case 15:zo(4,m,m.return);break;case 1:is(m,m.return);var k=m.stateNode;if(typeof k.componentWillUnmount=="function"){r=m,n=m.return;try{e=r,k.props=e.memoizedProps,k.state=e.memoizedState,k.componentWillUnmount()}catch(x){De(r,n,x)}}break;case 5:is(m,m.return);break;case 22:if(m.memoizedState!==null){zy(p);continue}}E!==null?(E.return=m,W=E):zy(p)}d=d.sibling}e:for(d=null,p=t;;){if(p.tag===5){if(d===null){d=p;try{i=p.stateNode,c?(s=i.style,typeof s.setProperty=="function"?s.setProperty("display","none","important"):s.display="none"):(l=p.stateNode,u=p.memoizedProps.style,o=u!=null&&u.hasOwnProperty("display")?u.display:null,l.style.display=IE("display",o))}catch(x){De(t,t.return,x)}}}else if(p.tag===6){if(d===null)try{p.stateNode.nodeValue=c?"":p.memoizedProps}catch(x){De(t,t.return,x)}}else if((p.tag!==22&&p.tag!==23||p.memoizedState===null||p===t)&&p.child!==null){p.child.return=p,p=p.child;continue}if(p===t)break e;for(;p.sibling===null;){if(p.return===null||p.return===t)break e;d===p&&(d=null),p=p.return}d===p&&(d=null),p.sibling.return=p.return,p=p.sibling}}break;case 19:tn(e,t),gn(t),r&4&&$y(t);break;case 21:break;default:tn(e,t),gn(t)}}function gn(t){var e=t.flags;if(e&2){try{e:{for(var n=t.return;n!==null;){if(QT(n)){var r=n;break e}n=n.return}throw Error(F(160))}switch(r.tag){case 5:var i=r.stateNode;r.flags&32&&(oa(i,""),r.flags&=-33);var s=Uy(t);Ef(t,s,i);break;case 3:case 4:var o=r.stateNode.containerInfo,l=Uy(t);wf(t,l,o);break;default:throw Error(F(161))}}catch(u){De(t,t.return,u)}t.flags&=-3}e&4096&&(t.flags&=-4097)}function oN(t,e,n){W=t,JT(t)}function JT(t,e,n){for(var r=(t.mode&1)!==0;W!==null;){var i=W,s=i.child;if(i.tag===22&&r){var o=i.memoizedState!==null||Hl;if(!o){var l=i.alternate,u=l!==null&&l.memoizedState!==null||mt;l=Hl;var c=mt;if(Hl=o,(mt=u)&&!c)for(W=i;W!==null;)o=W,u=o.child,o.tag===22&&o.memoizedState!==null?Wy(i):u!==null?(u.return=o,W=u):Wy(i);for(;s!==null;)W=s,JT(s),s=s.sibling;W=i,Hl=l,mt=c}By(t)}else i.subtreeFlags&8772&&s!==null?(s.return=i,W=s):By(t)}}function By(t){for(;W!==null;){var e=W;if(e.flags&8772){var n=e.alternate;try{if(e.flags&8772)switch(e.tag){case 0:case 11:case 15:mt||Lc(5,e);break;case 1:var r=e.stateNode;if(e.flags&4&&!mt)if(n===null)r.componentDidMount();else{var i=e.elementType===e.type?n.memoizedProps:nn(e.type,n.memoizedProps);r.componentDidUpdate(i,n.memoizedState,r.__reactInternalSnapshotBeforeUpdate)}var s=e.updateQueue;s!==null&&ky(e,s,r);break;case 3:var o=e.updateQueue;if(o!==null){if(n=null,e.child!==null)switch(e.child.tag){case 5:n=e.child.stateNode;break;case 1:n=e.child.stateNode}ky(e,o,n)}break;case 5:var l=e.stateNode;if(n===null&&e.flags&4){n=l;var u=e.memoizedProps;switch(e.type){case"button":case"input":case"select":case"textarea":u.autoFocus&&n.focus();break;case"img":u.src&&(n.src=u.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(e.memoizedState===null){var c=e.alternate;if(c!==null){var d=c.memoizedState;if(d!==null){var p=d.dehydrated;p!==null&&ca(p)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(F(163))}mt||e.flags&512&&vf(e)}catch(m){De(e,e.return,m)}}if(e===t){W=null;break}if(n=e.sibling,n!==null){n.return=e.return,W=n;break}W=e.return}}function zy(t){for(;W!==null;){var e=W;if(e===t){W=null;break}var n=e.sibling;if(n!==null){n.return=e.return,W=n;break}W=e.return}}function Wy(t){for(;W!==null;){var e=W;try{switch(e.tag){case 0:case 11:case 15:var n=e.return;try{Lc(4,e)}catch(u){De(e,n,u)}break;case 1:var r=e.stateNode;if(typeof r.componentDidMount=="function"){var i=e.return;try{r.componentDidMount()}catch(u){De(e,i,u)}}var s=e.return;try{vf(e)}catch(u){De(e,s,u)}break;case 5:var o=e.return;try{vf(e)}catch(u){De(e,o,u)}}}catch(u){De(e,e.return,u)}if(e===t){W=null;break}var l=e.sibling;if(l!==null){l.return=e.return,W=l;break}W=e.return}}var aN=Math.ceil,zu=lr.ReactCurrentDispatcher,Xp=lr.ReactCurrentOwner,Yt=lr.ReactCurrentBatchConfig,ue=0,Xe=null,Ue=null,rt=0,jt=0,ss=Xr(0),He=0,Ea=null,Ti=0,Vc=0,Jp=0,Wo=null,Nt=null,Zp=0,ks=1/0,Un=null,Wu=!1,Tf=null,br=null,ql=!1,Cr=null,Hu=0,Ho=0,If=null,cu=-1,hu=0;function Ct(){return ue&6?Fe():cu!==-1?cu:cu=Fe()}function Dr(t){return t.mode&1?ue&2&&rt!==0?rt&-rt:WA.transition!==null?(hu===0&&(hu=LE()),hu):(t=fe,t!==0||(t=window.event,t=t===void 0?16:zE(t.type)),t):1}function hn(t,e,n,r){if(50<Ho)throw Ho=0,If=null,Error(F(185));Wa(t,n,r),(!(ue&2)||t!==Xe)&&(t===Xe&&(!(ue&2)&&(Vc|=n),He===4&&wr(t,rt)),Dt(t,r),n===1&&ue===0&&!(e.mode&1)&&(ks=Fe()+500,Dc&&Jr()))}function Dt(t,e){var n=t.callbackNode;WR(t,e);var r=Au(t,t===Xe?rt:0);if(r===0)n!==null&&Z_(n),t.callbackNode=null,t.callbackPriority=0;else if(e=r&-r,t.callbackPriority!==e){if(n!=null&&Z_(n),e===1)t.tag===0?zA(Hy.bind(null,t)):lT(Hy.bind(null,t)),jA(function(){!(ue&6)&&Jr()}),n=null;else{switch(VE(r)){case 1:n=Cp;break;case 4:n=ME;break;case 16:n=Ru;break;case 536870912:n=OE;break;default:n=Ru}n=o0(n,ZT.bind(null,t))}t.callbackPriority=e,t.callbackNode=n}}function ZT(t,e){if(cu=-1,hu=0,ue&6)throw Error(F(327));var n=t.callbackNode;if(ds()&&t.callbackNode!==n)return null;var r=Au(t,t===Xe?rt:0);if(r===0)return null;if(r&30||r&t.expiredLanes||e)e=qu(t,r);else{e=r;var i=ue;ue|=2;var s=t0();(Xe!==t||rt!==e)&&(Un=null,ks=Fe()+500,mi(t,e));do try{cN();break}catch(l){e0(t,l)}while(!0);Fp(),zu.current=s,ue=i,Ue!==null?e=0:(Xe=null,rt=0,e=He)}if(e!==0){if(e===2&&(i=Qd(t),i!==0&&(r=i,e=Sf(t,i))),e===1)throw n=Ea,mi(t,0),wr(t,r),Dt(t,Fe()),n;if(e===6)wr(t,r);else{if(i=t.current.alternate,!(r&30)&&!lN(i)&&(e=qu(t,r),e===2&&(s=Qd(t),s!==0&&(r=s,e=Sf(t,s))),e===1))throw n=Ea,mi(t,0),wr(t,r),Dt(t,Fe()),n;switch(t.finishedWork=i,t.finishedLanes=r,e){case 0:case 1:throw Error(F(345));case 2:si(t,Nt,Un);break;case 3:if(wr(t,r),(r&130023424)===r&&(e=Zp+500-Fe(),10<e)){if(Au(t,0)!==0)break;if(i=t.suspendedLanes,(i&r)!==r){Ct(),t.pingedLanes|=t.suspendedLanes&i;break}t.timeoutHandle=rf(si.bind(null,t,Nt,Un),e);break}si(t,Nt,Un);break;case 4:if(wr(t,r),(r&4194240)===r)break;for(e=t.eventTimes,i=-1;0<r;){var o=31-cn(r);s=1<<o,o=e[o],o>i&&(i=o),r&=~s}if(r=i,r=Fe()-r,r=(120>r?120:480>r?480:1080>r?1080:1920>r?1920:3e3>r?3e3:4320>r?4320:1960*aN(r/1960))-r,10<r){t.timeoutHandle=rf(si.bind(null,t,Nt,Un),r);break}si(t,Nt,Un);break;case 5:si(t,Nt,Un);break;default:throw Error(F(329))}}}return Dt(t,Fe()),t.callbackNode===n?ZT.bind(null,t):null}function Sf(t,e){var n=Wo;return t.current.memoizedState.isDehydrated&&(mi(t,e).flags|=256),t=qu(t,e),t!==2&&(e=Nt,Nt=n,e!==null&&Cf(e)),t}function Cf(t){Nt===null?Nt=t:Nt.push.apply(Nt,t)}function lN(t){for(var e=t;;){if(e.flags&16384){var n=e.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var r=0;r<n.length;r++){var i=n[r],s=i.getSnapshot;i=i.value;try{if(!pn(s(),i))return!1}catch{return!1}}}if(n=e.child,e.subtreeFlags&16384&&n!==null)n.return=e,e=n;else{if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return!0;e=e.return}e.sibling.return=e.return,e=e.sibling}}return!0}function wr(t,e){for(e&=~Jp,e&=~Vc,t.suspendedLanes|=e,t.pingedLanes&=~e,t=t.expirationTimes;0<e;){var n=31-cn(e),r=1<<n;t[n]=-1,e&=~r}}function Hy(t){if(ue&6)throw Error(F(327));ds();var e=Au(t,0);if(!(e&1))return Dt(t,Fe()),null;var n=qu(t,e);if(t.tag!==0&&n===2){var r=Qd(t);r!==0&&(e=r,n=Sf(t,r))}if(n===1)throw n=Ea,mi(t,0),wr(t,e),Dt(t,Fe()),n;if(n===6)throw Error(F(345));return t.finishedWork=t.current.alternate,t.finishedLanes=e,si(t,Nt,Un),Dt(t,Fe()),null}function em(t,e){var n=ue;ue|=1;try{return t(e)}finally{ue=n,ue===0&&(ks=Fe()+500,Dc&&Jr())}}function Ii(t){Cr!==null&&Cr.tag===0&&!(ue&6)&&ds();var e=ue;ue|=1;var n=Yt.transition,r=fe;try{if(Yt.transition=null,fe=1,t)return t()}finally{fe=r,Yt.transition=n,ue=e,!(ue&6)&&Jr()}}function tm(){jt=ss.current,Ce(ss)}function mi(t,e){t.finishedWork=null,t.finishedLanes=0;var n=t.timeoutHandle;if(n!==-1&&(t.timeoutHandle=-1,FA(n)),Ue!==null)for(n=Ue.return;n!==null;){var r=n;switch(Op(r),r.tag){case 1:r=r.type.childContextTypes,r!=null&&Du();break;case 3:Ss(),Ce(xt),Ce(vt),Wp();break;case 5:zp(r);break;case 4:Ss();break;case 13:Ce(Ae);break;case 19:Ce(Ae);break;case 10:jp(r.type._context);break;case 22:case 23:tm()}n=n.return}if(Xe=t,Ue=t=Mr(t.current,null),rt=jt=e,He=0,Ea=null,Jp=Vc=Ti=0,Nt=Wo=null,ui!==null){for(e=0;e<ui.length;e++)if(n=ui[e],r=n.interleaved,r!==null){n.interleaved=null;var i=r.next,s=n.pending;if(s!==null){var o=s.next;s.next=i,r.next=o}n.pending=r}ui=null}return t}function e0(t,e){do{var n=Ue;try{if(Fp(),au.current=Bu,$u){for(var r=Ne.memoizedState;r!==null;){var i=r.queue;i!==null&&(i.pending=null),r=r.next}$u=!1}if(Ei=0,Qe=$e=Ne=null,Bo=!1,ya=0,Xp.current=null,n===null||n.return===null){He=1,Ea=e,Ue=null;break}e:{var s=t,o=n.return,l=n,u=e;if(e=rt,l.flags|=32768,u!==null&&typeof u=="object"&&typeof u.then=="function"){var c=u,d=l,p=d.tag;if(!(d.mode&1)&&(p===0||p===11||p===15)){var m=d.alternate;m?(d.updateQueue=m.updateQueue,d.memoizedState=m.memoizedState,d.lanes=m.lanes):(d.updateQueue=null,d.memoizedState=null)}var E=by(o);if(E!==null){E.flags&=-257,Dy(E,o,l,s,e),E.mode&1&&xy(s,c,e),e=E,u=c;var k=e.updateQueue;if(k===null){var x=new Set;x.add(u),e.updateQueue=x}else k.add(u);break e}else{if(!(e&1)){xy(s,c,e),nm();break e}u=Error(F(426))}}else if(ke&&l.mode&1){var P=by(o);if(P!==null){!(P.flags&65536)&&(P.flags|=256),Dy(P,o,l,s,e),Lp(Cs(u,l));break e}}s=u=Cs(u,l),He!==4&&(He=2),Wo===null?Wo=[s]:Wo.push(s),s=o;do{switch(s.tag){case 3:s.flags|=65536,e&=-e,s.lanes|=e;var S=VT(s,u,e);Cy(s,S);break e;case 1:l=u;var w=s.type,R=s.stateNode;if(!(s.flags&128)&&(typeof w.getDerivedStateFromError=="function"||R!==null&&typeof R.componentDidCatch=="function"&&(br===null||!br.has(R)))){s.flags|=65536,e&=-e,s.lanes|=e;var D=FT(s,l,e);Cy(s,D);break e}}s=s.return}while(s!==null)}r0(n)}catch(j){e=j,Ue===n&&n!==null&&(Ue=n=n.return);continue}break}while(!0)}function t0(){var t=zu.current;return zu.current=Bu,t===null?Bu:t}function nm(){(He===0||He===3||He===2)&&(He=4),Xe===null||!(Ti&268435455)&&!(Vc&268435455)||wr(Xe,rt)}function qu(t,e){var n=ue;ue|=2;var r=t0();(Xe!==t||rt!==e)&&(Un=null,mi(t,e));do try{uN();break}catch(i){e0(t,i)}while(!0);if(Fp(),ue=n,zu.current=r,Ue!==null)throw Error(F(261));return Xe=null,rt=0,He}function uN(){for(;Ue!==null;)n0(Ue)}function cN(){for(;Ue!==null&&!OR();)n0(Ue)}function n0(t){var e=s0(t.alternate,t,jt);t.memoizedProps=t.pendingProps,e===null?r0(t):Ue=e,Xp.current=null}function r0(t){var e=t;do{var n=e.alternate;if(t=e.return,e.flags&32768){if(n=rN(n,e),n!==null){n.flags&=32767,Ue=n;return}if(t!==null)t.flags|=32768,t.subtreeFlags=0,t.deletions=null;else{He=6,Ue=null;return}}else if(n=nN(n,e,jt),n!==null){Ue=n;return}if(e=e.sibling,e!==null){Ue=e;return}Ue=e=t}while(e!==null);He===0&&(He=5)}function si(t,e,n){var r=fe,i=Yt.transition;try{Yt.transition=null,fe=1,hN(t,e,n,r)}finally{Yt.transition=i,fe=r}return null}function hN(t,e,n,r){do ds();while(Cr!==null);if(ue&6)throw Error(F(327));n=t.finishedWork;var i=t.finishedLanes;if(n===null)return null;if(t.finishedWork=null,t.finishedLanes=0,n===t.current)throw Error(F(177));t.callbackNode=null,t.callbackPriority=0;var s=n.lanes|n.childLanes;if(HR(t,s),t===Xe&&(Ue=Xe=null,rt=0),!(n.subtreeFlags&2064)&&!(n.flags&2064)||ql||(ql=!0,o0(Ru,function(){return ds(),null})),s=(n.flags&15990)!==0,n.subtreeFlags&15990||s){s=Yt.transition,Yt.transition=null;var o=fe;fe=1;var l=ue;ue|=4,Xp.current=null,sN(t,n),XT(n,t),xA(tf),Nu=!!ef,tf=ef=null,t.current=n,oN(n),LR(),ue=l,fe=o,Yt.transition=s}else t.current=n;if(ql&&(ql=!1,Cr=t,Hu=i),s=t.pendingLanes,s===0&&(br=null),jR(n.stateNode),Dt(t,Fe()),e!==null)for(r=t.onRecoverableError,n=0;n<e.length;n++)i=e[n],r(i.value,{componentStack:i.stack,digest:i.digest});if(Wu)throw Wu=!1,t=Tf,Tf=null,t;return Hu&1&&t.tag!==0&&ds(),s=t.pendingLanes,s&1?t===If?Ho++:(Ho=0,If=t):Ho=0,Jr(),null}function ds(){if(Cr!==null){var t=VE(Hu),e=Yt.transition,n=fe;try{if(Yt.transition=null,fe=16>t?16:t,Cr===null)var r=!1;else{if(t=Cr,Cr=null,Hu=0,ue&6)throw Error(F(331));var i=ue;for(ue|=4,W=t.current;W!==null;){var s=W,o=s.child;if(W.flags&16){var l=s.deletions;if(l!==null){for(var u=0;u<l.length;u++){var c=l[u];for(W=c;W!==null;){var d=W;switch(d.tag){case 0:case 11:case 15:zo(8,d,s)}var p=d.child;if(p!==null)p.return=d,W=p;else for(;W!==null;){d=W;var m=d.sibling,E=d.return;if(KT(d),d===c){W=null;break}if(m!==null){m.return=E,W=m;break}W=E}}}var k=s.alternate;if(k!==null){var x=k.child;if(x!==null){k.child=null;do{var P=x.sibling;x.sibling=null,x=P}while(x!==null)}}W=s}}if(s.subtreeFlags&2064&&o!==null)o.return=s,W=o;else e:for(;W!==null;){if(s=W,s.flags&2048)switch(s.tag){case 0:case 11:case 15:zo(9,s,s.return)}var S=s.sibling;if(S!==null){S.return=s.return,W=S;break e}W=s.return}}var w=t.current;for(W=w;W!==null;){o=W;var R=o.child;if(o.subtreeFlags&2064&&R!==null)R.return=o,W=R;else e:for(o=w;W!==null;){if(l=W,l.flags&2048)try{switch(l.tag){case 0:case 11:case 15:Lc(9,l)}}catch(j){De(l,l.return,j)}if(l===o){W=null;break e}var D=l.sibling;if(D!==null){D.return=l.return,W=D;break e}W=l.return}}if(ue=i,Jr(),Tn&&typeof Tn.onPostCommitFiberRoot=="function")try{Tn.onPostCommitFiberRoot(Ac,t)}catch{}r=!0}return r}finally{fe=n,Yt.transition=e}}return!1}function qy(t,e,n){e=Cs(n,e),e=VT(t,e,1),t=xr(t,e,1),e=Ct(),t!==null&&(Wa(t,1,e),Dt(t,e))}function De(t,e,n){if(t.tag===3)qy(t,t,n);else for(;e!==null;){if(e.tag===3){qy(e,t,n);break}else if(e.tag===1){var r=e.stateNode;if(typeof e.type.getDerivedStateFromError=="function"||typeof r.componentDidCatch=="function"&&(br===null||!br.has(r))){t=Cs(n,t),t=FT(e,t,1),e=xr(e,t,1),t=Ct(),e!==null&&(Wa(e,1,t),Dt(e,t));break}}e=e.return}}function dN(t,e,n){var r=t.pingCache;r!==null&&r.delete(e),e=Ct(),t.pingedLanes|=t.suspendedLanes&n,Xe===t&&(rt&n)===n&&(He===4||He===3&&(rt&130023424)===rt&&500>Fe()-Zp?mi(t,0):Jp|=n),Dt(t,e)}function i0(t,e){e===0&&(t.mode&1?(e=Ll,Ll<<=1,!(Ll&130023424)&&(Ll=4194304)):e=1);var n=Ct();t=er(t,e),t!==null&&(Wa(t,e,n),Dt(t,n))}function fN(t){var e=t.memoizedState,n=0;e!==null&&(n=e.retryLane),i0(t,n)}function pN(t,e){var n=0;switch(t.tag){case 13:var r=t.stateNode,i=t.memoizedState;i!==null&&(n=i.retryLane);break;case 19:r=t.stateNode;break;default:throw Error(F(314))}r!==null&&r.delete(e),i0(t,n)}var s0;s0=function(t,e,n){if(t!==null)if(t.memoizedProps!==e.pendingProps||xt.current)Pt=!0;else{if(!(t.lanes&n)&&!(e.flags&128))return Pt=!1,tN(t,e,n);Pt=!!(t.flags&131072)}else Pt=!1,ke&&e.flags&1048576&&uT(e,Lu,e.index);switch(e.lanes=0,e.tag){case 2:var r=e.type;uu(t,e),t=e.pendingProps;var i=Es(e,vt.current);hs(e,n),i=qp(null,e,r,t,i,n);var s=Gp();return e.flags|=1,typeof i=="object"&&i!==null&&typeof i.render=="function"&&i.$$typeof===void 0?(e.tag=1,e.memoizedState=null,e.updateQueue=null,bt(r)?(s=!0,Mu(e)):s=!1,e.memoizedState=i.state!==null&&i.state!==void 0?i.state:null,$p(e),i.updater=Oc,e.stateNode=i,i._reactInternals=e,hf(e,r,t,n),e=pf(null,e,r,!0,s,n)):(e.tag=0,ke&&s&&Mp(e),It(null,e,i,n),e=e.child),e;case 16:r=e.elementType;e:{switch(uu(t,e),t=e.pendingProps,i=r._init,r=i(r._payload),e.type=r,i=e.tag=gN(r),t=nn(r,t),i){case 0:e=ff(null,e,r,t,n);break e;case 1:e=Ly(null,e,r,t,n);break e;case 11:e=My(null,e,r,t,n);break e;case 14:e=Oy(null,e,r,nn(r.type,t),n);break e}throw Error(F(306,r,""))}return e;case 0:return r=e.type,i=e.pendingProps,i=e.elementType===r?i:nn(r,i),ff(t,e,r,i,n);case 1:return r=e.type,i=e.pendingProps,i=e.elementType===r?i:nn(r,i),Ly(t,e,r,i,n);case 3:e:{if(BT(e),t===null)throw Error(F(387));r=e.pendingProps,s=e.memoizedState,i=s.element,mT(t,e),ju(e,r,null,n);var o=e.memoizedState;if(r=o.element,s.isDehydrated)if(s={element:r,isDehydrated:!1,cache:o.cache,pendingSuspenseBoundaries:o.pendingSuspenseBoundaries,transitions:o.transitions},e.updateQueue.baseState=s,e.memoizedState=s,e.flags&256){i=Cs(Error(F(423)),e),e=Vy(t,e,r,n,i);break e}else if(r!==i){i=Cs(Error(F(424)),e),e=Vy(t,e,r,n,i);break e}else for($t=Pr(e.stateNode.containerInfo.firstChild),Bt=e,ke=!0,sn=null,n=fT(e,null,r,n),e.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(Ts(),r===i){e=tr(t,e,n);break e}It(t,e,r,n)}e=e.child}return e;case 5:return gT(e),t===null&&lf(e),r=e.type,i=e.pendingProps,s=t!==null?t.memoizedProps:null,o=i.children,nf(r,i)?o=null:s!==null&&nf(r,s)&&(e.flags|=32),$T(t,e),It(t,e,o,n),e.child;case 6:return t===null&&lf(e),null;case 13:return zT(t,e,n);case 4:return Bp(e,e.stateNode.containerInfo),r=e.pendingProps,t===null?e.child=Is(e,null,r,n):It(t,e,r,n),e.child;case 11:return r=e.type,i=e.pendingProps,i=e.elementType===r?i:nn(r,i),My(t,e,r,i,n);case 7:return It(t,e,e.pendingProps,n),e.child;case 8:return It(t,e,e.pendingProps.children,n),e.child;case 12:return It(t,e,e.pendingProps.children,n),e.child;case 10:e:{if(r=e.type._context,i=e.pendingProps,s=e.memoizedProps,o=i.value,Ee(Vu,r._currentValue),r._currentValue=o,s!==null)if(pn(s.value,o)){if(s.children===i.children&&!xt.current){e=tr(t,e,n);break e}}else for(s=e.child,s!==null&&(s.return=e);s!==null;){var l=s.dependencies;if(l!==null){o=s.child;for(var u=l.firstContext;u!==null;){if(u.context===r){if(s.tag===1){u=Qn(-1,n&-n),u.tag=2;var c=s.updateQueue;if(c!==null){c=c.shared;var d=c.pending;d===null?u.next=u:(u.next=d.next,d.next=u),c.pending=u}}s.lanes|=n,u=s.alternate,u!==null&&(u.lanes|=n),uf(s.return,n,e),l.lanes|=n;break}u=u.next}}else if(s.tag===10)o=s.type===e.type?null:s.child;else if(s.tag===18){if(o=s.return,o===null)throw Error(F(341));o.lanes|=n,l=o.alternate,l!==null&&(l.lanes|=n),uf(o,n,e),o=s.sibling}else o=s.child;if(o!==null)o.return=s;else for(o=s;o!==null;){if(o===e){o=null;break}if(s=o.sibling,s!==null){s.return=o.return,o=s;break}o=o.return}s=o}It(t,e,i.children,n),e=e.child}return e;case 9:return i=e.type,r=e.pendingProps.children,hs(e,n),i=Jt(i),r=r(i),e.flags|=1,It(t,e,r,n),e.child;case 14:return r=e.type,i=nn(r,e.pendingProps),i=nn(r.type,i),Oy(t,e,r,i,n);case 15:return jT(t,e,e.type,e.pendingProps,n);case 17:return r=e.type,i=e.pendingProps,i=e.elementType===r?i:nn(r,i),uu(t,e),e.tag=1,bt(r)?(t=!0,Mu(e)):t=!1,hs(e,n),LT(e,r,i),hf(e,r,i,n),pf(null,e,r,!0,t,n);case 19:return WT(t,e,n);case 22:return UT(t,e,n)}throw Error(F(156,e.tag))};function o0(t,e){return DE(t,e)}function mN(t,e,n,r){this.tag=t,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=e,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=r,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Qt(t,e,n,r){return new mN(t,e,n,r)}function rm(t){return t=t.prototype,!(!t||!t.isReactComponent)}function gN(t){if(typeof t=="function")return rm(t)?1:0;if(t!=null){if(t=t.$$typeof,t===Tp)return 11;if(t===Ip)return 14}return 2}function Mr(t,e){var n=t.alternate;return n===null?(n=Qt(t.tag,e,t.key,t.mode),n.elementType=t.elementType,n.type=t.type,n.stateNode=t.stateNode,n.alternate=t,t.alternate=n):(n.pendingProps=e,n.type=t.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=t.flags&14680064,n.childLanes=t.childLanes,n.lanes=t.lanes,n.child=t.child,n.memoizedProps=t.memoizedProps,n.memoizedState=t.memoizedState,n.updateQueue=t.updateQueue,e=t.dependencies,n.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext},n.sibling=t.sibling,n.index=t.index,n.ref=t.ref,n}function du(t,e,n,r,i,s){var o=2;if(r=t,typeof t=="function")rm(t)&&(o=1);else if(typeof t=="string")o=5;else e:switch(t){case Qi:return gi(n.children,i,s,e);case Ep:o=8,i|=8;break;case Md:return t=Qt(12,n,e,i|2),t.elementType=Md,t.lanes=s,t;case Od:return t=Qt(13,n,e,i),t.elementType=Od,t.lanes=s,t;case Ld:return t=Qt(19,n,e,i),t.elementType=Ld,t.lanes=s,t;case gE:return Fc(n,i,s,e);default:if(typeof t=="object"&&t!==null)switch(t.$$typeof){case pE:o=10;break e;case mE:o=9;break e;case Tp:o=11;break e;case Ip:o=14;break e;case _r:o=16,r=null;break e}throw Error(F(130,t==null?t:typeof t,""))}return e=Qt(o,n,e,i),e.elementType=t,e.type=r,e.lanes=s,e}function gi(t,e,n,r){return t=Qt(7,t,r,e),t.lanes=n,t}function Fc(t,e,n,r){return t=Qt(22,t,r,e),t.elementType=gE,t.lanes=n,t.stateNode={isHidden:!1},t}function dd(t,e,n){return t=Qt(6,t,null,e),t.lanes=n,t}function fd(t,e,n){return e=Qt(4,t.children!==null?t.children:[],t.key,e),e.lanes=n,e.stateNode={containerInfo:t.containerInfo,pendingChildren:null,implementation:t.implementation},e}function _N(t,e,n,r,i){this.tag=e,this.containerInfo=t,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Gh(0),this.expirationTimes=Gh(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Gh(0),this.identifierPrefix=r,this.onRecoverableError=i,this.mutableSourceEagerHydrationData=null}function im(t,e,n,r,i,s,o,l,u){return t=new _N(t,e,n,l,u),e===1?(e=1,s===!0&&(e|=8)):e=0,s=Qt(3,null,null,e),t.current=s,s.stateNode=t,s.memoizedState={element:r,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},$p(s),t}function yN(t,e,n){var r=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:Ki,key:r==null?null:""+r,children:t,containerInfo:e,implementation:n}}function a0(t){if(!t)return Br;t=t._reactInternals;e:{if(Mi(t)!==t||t.tag!==1)throw Error(F(170));var e=t;do{switch(e.tag){case 3:e=e.stateNode.context;break e;case 1:if(bt(e.type)){e=e.stateNode.__reactInternalMemoizedMergedChildContext;break e}}e=e.return}while(e!==null);throw Error(F(171))}if(t.tag===1){var n=t.type;if(bt(n))return aT(t,n,e)}return e}function l0(t,e,n,r,i,s,o,l,u){return t=im(n,r,!0,t,i,s,o,l,u),t.context=a0(null),n=t.current,r=Ct(),i=Dr(n),s=Qn(r,i),s.callback=e??null,xr(n,s,i),t.current.lanes=i,Wa(t,i,r),Dt(t,r),t}function jc(t,e,n,r){var i=e.current,s=Ct(),o=Dr(i);return n=a0(n),e.context===null?e.context=n:e.pendingContext=n,e=Qn(s,o),e.payload={element:t},r=r===void 0?null:r,r!==null&&(e.callback=r),t=xr(i,e,o),t!==null&&(hn(t,i,o,s),ou(t,i,o)),o}function Gu(t){if(t=t.current,!t.child)return null;switch(t.child.tag){case 5:return t.child.stateNode;default:return t.child.stateNode}}function Gy(t,e){if(t=t.memoizedState,t!==null&&t.dehydrated!==null){var n=t.retryLane;t.retryLane=n!==0&&n<e?n:e}}function sm(t,e){Gy(t,e),(t=t.alternate)&&Gy(t,e)}function vN(){return null}var u0=typeof reportError=="function"?reportError:function(t){console.error(t)};function om(t){this._internalRoot=t}Uc.prototype.render=om.prototype.render=function(t){var e=this._internalRoot;if(e===null)throw Error(F(409));jc(t,e,null,null)};Uc.prototype.unmount=om.prototype.unmount=function(){var t=this._internalRoot;if(t!==null){this._internalRoot=null;var e=t.containerInfo;Ii(function(){jc(null,t,null,null)}),e[Zn]=null}};function Uc(t){this._internalRoot=t}Uc.prototype.unstable_scheduleHydration=function(t){if(t){var e=UE();t={blockedOn:null,target:t,priority:e};for(var n=0;n<vr.length&&e!==0&&e<vr[n].priority;n++);vr.splice(n,0,t),n===0&&BE(t)}};function am(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11)}function $c(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11&&(t.nodeType!==8||t.nodeValue!==" react-mount-point-unstable "))}function Ky(){}function wN(t,e,n,r,i){if(i){if(typeof r=="function"){var s=r;r=function(){var c=Gu(o);s.call(c)}}var o=l0(e,r,t,0,null,!1,!1,"",Ky);return t._reactRootContainer=o,t[Zn]=o.current,fa(t.nodeType===8?t.parentNode:t),Ii(),o}for(;i=t.lastChild;)t.removeChild(i);if(typeof r=="function"){var l=r;r=function(){var c=Gu(u);l.call(c)}}var u=im(t,0,!1,null,null,!1,!1,"",Ky);return t._reactRootContainer=u,t[Zn]=u.current,fa(t.nodeType===8?t.parentNode:t),Ii(function(){jc(e,u,n,r)}),u}function Bc(t,e,n,r,i){var s=n._reactRootContainer;if(s){var o=s;if(typeof i=="function"){var l=i;i=function(){var u=Gu(o);l.call(u)}}jc(e,o,t,i)}else o=wN(n,e,t,i,r);return Gu(o)}FE=function(t){switch(t.tag){case 3:var e=t.stateNode;if(e.current.memoizedState.isDehydrated){var n=xo(e.pendingLanes);n!==0&&(kp(e,n|1),Dt(e,Fe()),!(ue&6)&&(ks=Fe()+500,Jr()))}break;case 13:Ii(function(){var r=er(t,1);if(r!==null){var i=Ct();hn(r,t,1,i)}}),sm(t,1)}};Rp=function(t){if(t.tag===13){var e=er(t,134217728);if(e!==null){var n=Ct();hn(e,t,134217728,n)}sm(t,134217728)}};jE=function(t){if(t.tag===13){var e=Dr(t),n=er(t,e);if(n!==null){var r=Ct();hn(n,t,e,r)}sm(t,e)}};UE=function(){return fe};$E=function(t,e){var n=fe;try{return fe=t,e()}finally{fe=n}};qd=function(t,e,n){switch(e){case"input":if(jd(t,n),e=n.name,n.type==="radio"&&e!=null){for(n=t;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+e)+'][type="radio"]'),e=0;e<n.length;e++){var r=n[e];if(r!==t&&r.form===t.form){var i=bc(r);if(!i)throw Error(F(90));yE(r),jd(r,i)}}}break;case"textarea":wE(t,n);break;case"select":e=n.value,e!=null&&as(t,!!n.multiple,e,!1)}};RE=em;AE=Ii;var EN={usingClientEntryPoint:!1,Events:[qa,Zi,bc,CE,kE,em]},Io={findFiberByHostInstance:li,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},TN={bundleType:Io.bundleType,version:Io.version,rendererPackageName:Io.rendererPackageName,rendererConfig:Io.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:lr.ReactCurrentDispatcher,findHostInstanceByFiber:function(t){return t=xE(t),t===null?null:t.stateNode},findFiberByHostInstance:Io.findFiberByHostInstance||vN,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var Gl=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!Gl.isDisabled&&Gl.supportsFiber)try{Ac=Gl.inject(TN),Tn=Gl}catch{}}Wt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=EN;Wt.createPortal=function(t,e){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!am(e))throw Error(F(200));return yN(t,e,null,n)};Wt.createRoot=function(t,e){if(!am(t))throw Error(F(299));var n=!1,r="",i=u0;return e!=null&&(e.unstable_strictMode===!0&&(n=!0),e.identifierPrefix!==void 0&&(r=e.identifierPrefix),e.onRecoverableError!==void 0&&(i=e.onRecoverableError)),e=im(t,1,!1,null,null,n,!1,r,i),t[Zn]=e.current,fa(t.nodeType===8?t.parentNode:t),new om(e)};Wt.findDOMNode=function(t){if(t==null)return null;if(t.nodeType===1)return t;var e=t._reactInternals;if(e===void 0)throw typeof t.render=="function"?Error(F(188)):(t=Object.keys(t).join(","),Error(F(268,t)));return t=xE(e),t=t===null?null:t.stateNode,t};Wt.flushSync=function(t){return Ii(t)};Wt.hydrate=function(t,e,n){if(!$c(e))throw Error(F(200));return Bc(null,t,e,!0,n)};Wt.hydrateRoot=function(t,e,n){if(!am(t))throw Error(F(405));var r=n!=null&&n.hydratedSources||null,i=!1,s="",o=u0;if(n!=null&&(n.unstable_strictMode===!0&&(i=!0),n.identifierPrefix!==void 0&&(s=n.identifierPrefix),n.onRecoverableError!==void 0&&(o=n.onRecoverableError)),e=l0(e,null,t,1,n??null,i,!1,s,o),t[Zn]=e.current,fa(t),r)for(t=0;t<r.length;t++)n=r[t],i=n._getVersion,i=i(n._source),e.mutableSourceEagerHydrationData==null?e.mutableSourceEagerHydrationData=[n,i]:e.mutableSourceEagerHydrationData.push(n,i);return new Uc(e)};Wt.render=function(t,e,n){if(!$c(e))throw Error(F(200));return Bc(null,t,e,!1,n)};Wt.unmountComponentAtNode=function(t){if(!$c(t))throw Error(F(40));return t._reactRootContainer?(Ii(function(){Bc(null,null,t,!1,function(){t._reactRootContainer=null,t[Zn]=null})}),!0):!1};Wt.unstable_batchedUpdates=em;Wt.unstable_renderSubtreeIntoContainer=function(t,e,n,r){if(!$c(n))throw Error(F(200));if(t==null||t._reactInternals===void 0)throw Error(F(38));return Bc(t,e,n,!1,r)};Wt.version="18.3.1-next-f1338f8080-20240426";function c0(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(c0)}catch(t){console.error(t)}}c0(),cE.exports=Wt;var IN=cE.exports,h0,Qy=IN;h0=Qy.createRoot,Qy.hydrateRoot;const lm=1,Mt=["gold","wood","stone","food","ore"],vn={gold:{name:"Gold",icon:"🪙",color:"#f2c14e"},wood:{name:"Wood",icon:"🪵",color:"#c08a5a"},stone:{name:"Stone",icon:"🧱",color:"#9aa8b6"},food:{name:"Food",icon:"🌾",color:"#b8cf6a"},ore:{name:"Ore",icon:"⛓",color:"#6fc7d8"}};function SN(){return{gold:0,wood:0,stone:0,food:0,ore:0}}const Yy=80,fu=40,zc=3,Wc=3,kf=72,CN=9,kN=12*3600,RN=40,Xy=[60,300,900],Jy=2,AN=24,Si=[{id:0,name:"Home Isle",cols:6,rows:4,needHq:0,needWaves:0},{id:1,name:"Tidebreak Isle",cols:6,rows:4,needHq:10,needWaves:10},{id:2,name:"Stormcrag Isle",cols:6,rows:4,needHq:20,needWaves:20}];function NN(t,e){const n=(t-1)/2,r=(e-1)/2,i=[];for(let s=0;s<t*e;s++)i.push(s);return i.sort((s,o)=>{const l=s%t,u=Math.floor(s/t),c=o%t,d=Math.floor(o/t),p=Math.hypot(l-n,u-r),m=Math.hypot(c-n,d-r);return Math.abs(p-m)>.001?p-m:s-o}),i}const d0=NN(Si[0].cols,Si[0].rows);function PN(t,e){const n=d0.indexOf(e);return n<0?-1:t*AN+n}function qo(t,e,n){const r=PN(e,n);return r>=0&&r<t}function um(t,e,n){const r=Si[n];return r?t>=r.needWaves&&e>=r.needHq:!1}const ve={command:{kind:"command",name:"Command Center",icon:"❖",cat:"command",unique:!0,blurb:"Gates research levels, merge ceilings and island expansion. Max level 80."},goldmine:{kind:"goldmine",name:"Gold Mine",icon:"⛏",cat:"economy",produces:"gold",blurb:"Produces gold over time."},lumbermill:{kind:"lumbermill",name:"Lumber Mill",icon:"🪓",cat:"economy",produces:"wood",blurb:"Produces wood over time."},quarry:{kind:"quarry",name:"Quarry",icon:"🪨",cat:"economy",produces:"stone",blurb:"Produces stone over time."},farm:{kind:"farm",name:"Farm",icon:"🌾",cat:"economy",produces:"food",blurb:"Produces food for training and for hunting."},oremine:{kind:"oremine",name:"Ore Mine",icon:"⚙",cat:"economy",produces:"ore",blurb:"Produces ore for high-tier units."},barracks:{kind:"barracks",name:"Barracks",icon:"🛡",cat:"military",branch:"army",blurb:"Trains Army units. Its level raises that branch trainable tier ceiling."},shipyard:{kind:"shipyard",name:"Shipyard",icon:"⚓",cat:"military",branch:"navy",blurb:"Trains Navy units."},airbase:{kind:"airbase",name:"Air Base",icon:"✈",cat:"military",branch:"air",blurb:"Trains Air units."},research:{kind:"research",name:"Research Center",icon:"🔬",cat:"support",blurb:"Runs one research project at a time. Everything is gated by it."},repair:{kind:"repair",name:"Repair Factory",icon:"🔧",cat:"support",blurb:"Cuts troop losses by 4% per level (max 48%)."},decor:{kind:"decor",name:"Decor Garden",icon:"🌳",cat:"support",blurb:"+2% training speed per level. Two level-N gardens beat one merged garden."}},f0=["goldmine","lumbermill","quarry","farm","oremine","barracks","shipyard","airbase","research","repair","decor"],xN={command:{gold:220,wood:180,stone:140},goldmine:{gold:60,wood:80},lumbermill:{gold:70,stone:50},quarry:{gold:80,wood:70},farm:{gold:60,wood:50},oremine:{gold:100,wood:80},barracks:{gold:110,wood:120,stone:50},shipyard:{gold:130,wood:140,stone:70},airbase:{gold:160,wood:160,stone:90,ore:20},research:{gold:140,wood:130,stone:90},repair:{gold:120,wood:110,stone:120},decor:{gold:40,wood:30}};function fs(t,e){const n=Math.pow(1.28,Math.max(0,e-1)),r=xN[t],i={};for(const s of Mt){const o=r[s];o&&(i[s]=Math.ceil(o*n))}return i}const bN={command:30,economy:9,military:18,support:14};function p0(t,e){const n=bN[ve[t].cat];return Math.min(4*3600,Math.max(3,Math.round(n*Math.pow(1.24,Math.max(0,e-1)))))}const DN={gold:.9,wood:1.05,stone:.8,food:1,ore:.45};function m0(t,e){const n=ve[t];return n.produces?DN[n.produces]*Math.pow(Math.max(1,e),1.2):0}const cm=[{key:"construction",name:"Structure Level",icon:"🏗",blurb:"New structures are built at this level, and it sets the merge ceiling: merges reach at most 3 levels above it."},{key:"merge",name:"Merge Level",icon:"🔗",blurb:"Hard cap on how high any structure may be merged. Never more than 3 above Structure Level."},{key:"unitForce",name:"Unit Force Combination",icon:"🎖",blurb:"Hard cap on troop combination tiers. Never more than 3 above the Merge Level."}];function Ka(t){return Math.min(t.merge,t.construction+zc)}function g0(t){return Math.min(t.unitForce,Ka(t)+Wc)}function _0(t,e){const n={construction:{gold:160,wood:120},merge:{gold:200,stone:140},unitForce:{gold:240,food:160,ore:20}},r=Math.pow(1.42,Math.max(0,e-1)),i={};for(const s of Mt){const o=n[t][s];o&&(i[s]=Math.ceil(o*r))}return i}function y0(t,e){const n=t==="unitForce"?40:30;return Math.min(3*3600,Math.max(5,Math.round(n*Math.pow(1.28,Math.max(0,e-1)))))}function v0(t,e){return t==="construction"?fu:t==="merge"?Math.min(fu,e.construction+zc):Math.min(fu,Ka(e)+Wc)}const Ta=[{key:"army",name:"Army",kind:"barracks",icon:"🛡",unit:"Infantry",mul:1,blurb:"Cheap and sturdy. Holds the line."},{key:"navy",name:"Navy",kind:"shipyard",icon:"⚓",unit:"Warship",mul:1.15,blurb:"More power per unit, slower to train."},{key:"air",name:"Air Force",kind:"airbase",icon:"✈",unit:"Aircraft",mul:1.3,blurb:"Highest power per unit, costs ore."}];function Ia(t){return Ta.find(e=>e.key===t)??Ta[0]}function w0(t,e=1){return 8*Math.pow(Math.max(1,t),1.6)*e}function E0(t){const e=Math.pow(Math.max(1,t),1.45),n={food:Math.ceil(18*e),gold:Math.ceil(10*e)};return t>=4&&(n.ore=Math.ceil(3*e)),n}function T0(t){return Math.max(2,Math.round(5*Math.pow(Math.max(1,t),1.25)))}function I0(t){return 42*Math.pow(1.55,Math.max(0,t-1))}function MN(t){const e=Math.pow(1.5,Math.max(0,t-1));return{gold:Math.ceil(70*e),wood:Math.ceil(60*e),stone:Math.ceil(40*e),food:Math.ceil(30*e)}}function S0(t){return Math.ceil(t*.9)}const Rf=9,Zy=7,ev=["Sunken","Ashen","Verdant","Fractured","Hollow","Gilded","Stormworn","Frostbitten","Crimson","Wraithen"],tv=["Ridge","Dunes","Reach","Hollow","Marsh","Spire","Expanse","Glade","Basin","Bluffs"];function ON(t,e,n){let r=t*73856093^e*19349663^n*83492791;return r=Math.abs(r)%1e5,r}function LN(t,e,n){const r=ON(t,e,n);return`${ev[r%ev.length]} ${tv[(r>>3)%tv.length]}`}function VN(t){const e=[],n=Math.floor(Rf/2),r=Math.floor(Zy/2);for(let i=0;i<Zy;i++)for(let s=0;s<Rf;s++){const o=Math.max(Math.abs(s-n),Math.abs(i-r));e.push({id:`${s}:${i}`,name:LN(s,i,t),col:s,row:i,depth:o,revealed:o===0,hunts:0})}return e}function FN(t){return[`${t.col+1}:${t.row}`,`${t.col-1}:${t.row}`,`${t.col}:${t.row+1}`,`${t.col}:${t.row-1}`]}function C0(t){return 55*Math.pow(1.7,t)}function k0(t){return{food:Math.ceil(30*Math.pow(1.45,t))}}function R0(t){const e=Math.pow(1.4,t);return{gold:Math.ceil(50*e),wood:Math.ceil(35*e)}}function A0(t){return 18+t*16}function jN(t){const e=Math.pow(1.6,t);return{gold:Math.ceil(90*e),ore:Math.ceil(10*e),food:Math.ceil(50*e)}}const UN=["Crude","Worn","Sturdy","Honed","Master","Fabled","Mythic"],pd={weapon:["Blade","Glaive","Maul","Lance","Carbine"],armor:["Plate","Hauberk","Aegis","Carapace","Rig"],relic:["Sigil","Idol","Core","Charm","Codex"]};function $N(t,e){const n=["weapon","armor","relic"],r=n[Math.floor(e()*n.length)%n.length],i=Math.max(1,Math.min(7,1+t+(e()<.3?1:0))),s=Math.pow(i,1.35),o={id:`g_${Math.floor(e()*1e9).toString(36)}`,name:`${UN[i-1]} ${pd[r][Math.floor(e()*pd[r].length)%pd[r].length]}`,slot:r,tier:i,atk:0,gather:0,build:0,prod:0};return r==="weapon"&&(o.atk=Math.max(1,Math.round(4*s))),r==="armor"&&(o.build=Math.max(1,Math.round(3*s)),o.prod=Math.max(1,Math.round(2*s))),r==="relic"&&(o.gather=Math.max(1,Math.round(4*s)),o.prod=Math.max(1,Math.round(2*s))),o}const Qa=[{id:"vane",name:"Ira Vane",title:"Vanguard",focus:"combat",reqGatherSeconds:0,reqKills:0,blurb:"+2% battle power per level."},{id:"reed",name:"Silas Reed",title:"Pathfinder",focus:"gather",reqGatherSeconds:240,reqKills:3,blurb:"+2% gathering yield per level. Joins from time spent gathering and hunting."},{id:"holt",name:"Mira Holt",title:"Architect",focus:"build",reqGatherSeconds:1200,reqKills:12,blurb:"+1.5% build speed per level. Joins once you have truly worked the frontier."}],N0={combat:.02,gather:.02,build:.015};function Af(t){return Math.round(60*Math.pow(Math.max(1,t),1.5))}function hm(t,e,n){return e>=t.reqGatherSeconds&&n>=t.reqKills}function BN(t){return .8+.3*t}const zN=new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1});function _e(t){const e=Math.floor(t);return Math.abs(e)<1e3?String(e):zN.format(e)}function ot(t){const e=Math.max(0,Math.round(t));if(e<60)return`${e}s`;const n=Math.floor(e/60),r=e%60;if(n<60)return r?`${n}m ${r}s`:`${n}m`;const i=Math.floor(n/60),s=n%60;return s?`${i}h ${s}m`:`${i}h`}let nv=0;function Zr(){return nv+=1,`${Date.now().toString(36)}${nv.toString(36)}${Math.random().toString(36).slice(2,5)}`}function WN(){return Math.random().toString(36).slice(2,8).toUpperCase()}function mn(t){const e=t.buildings.find(n=>n.kind==="command");return e?e.level:1}function dm(t,e){const n=Ia(e).kind;return t.buildings.filter(r=>r.kind===n).reduce((r,i)=>Math.max(r,i.level),0)}function fm(t,e){return Math.min(g0(t.research),dm(t,e)+Wc)}function Nf(t){return 2+Math.floor(mn(t)/10)}function P0(t){return t.jobs.filter(e=>e.type==="upgrade").length}function HN(t){const e=t.buildings.filter(n=>n.kind==="repair").reduce((n,r)=>Math.max(n,r.level),0);return Math.min(.48,e*.04)}function x0(t){const e=t.buildings.filter(n=>n.kind==="decor").reduce((n,r)=>n+r.level,0);return Math.min(.6,e*.02)}function b0(t,e){let n=0;for(const r of["weapon","armor","relic"]){const i=t.equipped[r];if(!i)continue;const s=t.gear.find(o=>o.id===i);s&&(n+=s[e])}return n/100}function qN(t,e){const n=Qa.find(r=>r.id===e);return n?hm(n,t.stats.gatherSeconds,t.stats.kills):!1}function Rs(t,e){let n=0;for(const i of t.heroes){const s=Qa.find(o=>o.id===i.id);!s||s.focus!==e||hm(s,t.stats.gatherSeconds,t.stats.kills)&&(n+=i.level*N0[e])}return n+b0(t,e==="combat"?"atk":e)}function pm(t){const e=SN();for(const r of t.buildings){const i=ve[r.kind];i.produces&&(e[i.produces]+=m0(r.kind,r.level))}const n=1+b0(t,"prod");for(const r of Mt)e[r]*=n;return e}function _i(t){let e=0;for(const n of Ta)for(const r of Object.keys(t.troops[n.key])){const i=Number(r),s=t.troops[n.key][r]??0;!Number.isFinite(i)||s<=0||(e+=s*w0(i,n.mul))}return e}function nr(t){return _i(t)*(1+Rs(t,"combat"))}function GN(t,e){return Object.keys(t.troops[e]).map(Number).filter(n=>Number.isFinite(n)&&(t.troops[e][String(n)]??0)>0).sort((n,r)=>n-r)}function KN(t){return t.alliance.members.reduce((e,n)=>e+n.power,0)+nr(t)}function z(t,e,n="info"){t.log.unshift({id:Zr(),at:Date.now(),text:e,tone:n}),t.log.length>80&&(t.log.length=80)}function Ws(t,e){return Mt.every(n=>t.resources[n]>=(e[n]??0))}function Hs(t,e){for(const n of Mt)t.resources[n]-=e[n]??0}function Hc(t,e){for(const n of Mt)t.resources[n]+=e[n]??0}function D0(t,e){const n={};for(const r of Mt){const i=t[r];i&&(n[r]=Math.ceil(i*e))}return n}function QN(t,e){const n=Date.now(),r=Math.floor(Math.random()*1e6),i={version:lm,name:t.trim().slice(0,20)||"Commander",seed:r,createdAt:n,updatedAt:n,resources:{gold:560,wood:560,stone:380,food:520,ore:90},buildings:[],unlockedPlots:CN,research:{construction:1,merge:2,unitForce:4},jobs:[],troops:{army:{1:6},navy:{},air:{}},heroes:Qa.map(o=>({id:o.id,level:1,xp:0})),gear:[],equipped:{},zones:VN(r),wavesCleared:0,log:[],alliance:{code:WN(),name:"",members:[]},stats:{kills:0,hunts:0,merges:0,built:0,gathered:0,gatherSeconds:0}};return i.alliance.name=`${i.name}'s Banner`,["command","goldmine","lumbermill","farm","barracks"].forEach((o,l)=>{i.buildings.push({uid:Zr(),kind:o,level:1,island:0,plot:d0[l]})}),z(i,`You take command of ${i.alliance.name}. No shop, no VIP, no packages — only the work you put in.`,"epic"),z(i,"Next: clear Wave 1, then merge two Level 1 Gold Mines to reach Level 2.","info"),e&&gm(i,e),i}function YN(t,e=Date.now()){const n=(e-t.updatedAt)/1e3;if(!Number.isFinite(n)||n<=0){t.updatedAt=e;return}const r=Math.min(n,kN),i=pm(t);for(const o of Mt)t.resources[o]+=i[o]*r;const s=t.jobs.filter(o=>o.endsAt<=e);if(s.length){t.jobs=t.jobs.filter(o=>o.endsAt>e);for(const o of s)XN(t,o)}t.updatedAt=e}function XN(t,e){if(e.type==="upgrade"&&e.buildingUid){const n=t.buildings.find(r=>r.uid===e.buildingUid);n&&(n.level=e.targetLevel??n.level+1,z(t,`${ve[n.kind].name} reached Level ${n.level}.`,"ok"));return}if(e.type==="research"&&e.track){const n=e.track,r=Math.min(fu,e.targetLevel??t.research[n]+1);t.research[n]=r;const i=cm.find(s=>s.key===n);z(t,`Research complete: ${i?i.name:n} Level ${r}.`,"ok");return}if(e.type==="train"&&e.branch&&e.tier&&e.count){M0(t,e.branch,e.tier,e.count),z(t,`${e.count} ${Ia(e.branch).unit} (Tier ${e.tier}) finished training.`,"ok");return}if(e.type==="scout"&&e.zoneId){const n=t.zones.find(r=>r.id===e.zoneId);n&&(n.revealed=!0,z(t,`Scouts reached ${n.name} — depth ${n.depth}.`,"ok"));return}if(e.type==="gather"&&e.res&&e.amount){const n=e.res;t.resources[n]+=e.amount,t.stats.gathered+=e.amount,t.stats.gatherSeconds+=e.duration,mm(t,"gather",Math.round(e.duration*.5)),z(t,`Gathering party returned with ${_e(e.amount)} ${vn[n].name}.`,"ok")}}function M0(t,e,n,r){const i=String(n);t.troops[e][i]=(t.troops[e][i]??0)+r}function mm(t,e,n){if(!(n<=0))for(const r of t.heroes){const i=Qa.find(s=>s.id===r.id);if(!(!i||i.focus!==e)&&hm(i,t.stats.gatherSeconds,t.stats.kills))for(r.xp+=n;r.level<RN&&r.xp>=Af(r.level);)r.xp-=Af(r.level),r.level+=1,z(t,`${i.name} reached Level ${r.level}.`,"epic")}}function JN(t,e,n,r){const i=mn(t);if(!um(t.wavesCleared,i,n))return z(t,"That island is not open yet — clear more waves and raise the Command Center.","warn"),!1;if(!qo(t.unlockedPlots,n,r))return z(t,"That plot is still wilderness. Clear waves to expand.","warn"),!1;if(t.buildings.some(l=>l.island===n&&l.plot===r))return z(t,"That plot is occupied.","warn"),!1;if(e==="command"&&t.buildings.some(l=>l.kind==="command"))return z(t,"You can only have one Command Center.","warn"),!1;if(e!=="command"&&!f0.includes(e))return!1;const s=Math.max(1,t.research.construction),o=fs(e,s);return Ws(t,o)?(Hs(t,o),t.buildings.push({uid:Zr(),kind:e,level:s,island:n,plot:r}),t.stats.built+=1,z(t,`${ve[e].name} raised at Level ${s}.`,"ok"),!0):(z(t,"Not enough resources to build that.","warn"),!1)}function ZN(t,e){const n=t.buildings.find(o=>o.uid===e);if(!n)return!1;if(t.jobs.some(o=>o.type==="upgrade"&&o.buildingUid===e))return z(t,"That building is already upgrading.","warn"),!1;const r=n.level+1;if(n.kind==="command"){if(r>Yy)return z(t,`The Command Center caps at Level ${Yy}.`,"warn"),!1;const o=S0(r);if(t.wavesCleared<o)return z(t,`Clear ${o} campaign waves before the Command Center can reach Level ${r}.`,"warn"),!1}else if(n.level>=t.research.construction)return z(t,`${ve[n.kind].name} is at your Structure Level (Lv ${t.research.construction}). Raise Structure Level research, or merge two identical Lv ${n.level} buildings.`,"warn"),!1;if(P0(t)>=Nf(t))return z(t,`All ${Nf(t)} build crews are busy.`,"warn"),!1;const i=fs(n.kind,r);if(!Ws(t,i))return z(t,"Not enough resources for that upgrade.","warn"),!1;Hs(t,i);const s=Math.max(2,Math.round(p0(n.kind,r)*(1-Rs(t,"build"))));return t.jobs.push({id:Zr(),type:"upgrade",label:`${ve[n.kind].name} → Lv ${r}`,startedAt:Date.now(),endsAt:Date.now()+s*1e3,duration:s,buildingUid:e,targetLevel:r}),z(t,`Upgrading ${ve[n.kind].name} to Level ${r} (${ot(s)}).`,"info"),!0}function eP(t,e){const n=t.buildings.find(o=>o.uid===e);if(!n)return!1;if(n.kind==="command")return z(t,"The Command Center cannot be merged.","warn"),!1;const r=n.level+1,i=Ka(t.research);if(r>i)return z(t,`Merge ceiling is Level ${i}. Raise Merge Level research (max Structure Level + ${zc}) to go higher.`,"warn"),!1;const s=t.buildings.find(o=>o.uid!==n.uid&&o.kind===n.kind&&o.level===n.level);return s?t.jobs.some(o=>o.buildingUid===s.uid)?(z(t,`The partner ${ve[n.kind].name} is busy — wait for its job to finish.`,"warn"),!1):(t.buildings=t.buildings.filter(o=>o.uid!==s.uid),n.level=r,t.stats.merges+=1,z(t,`Merged two Lv ${r-1} ${ve[n.kind].name}s into one Level ${r}. A plot was freed.`,"ok"),!0):(z(t,`Merging needs two identical ${ve[n.kind].name}s at Level ${n.level}.`,"warn"),!1)}function tP(t,e){const n=t.buildings.find(s=>s.uid===e);if(!n)return!1;if(n.kind==="command")return z(t,"The Command Center cannot be demolished.","warn"),!1;if(t.jobs.some(s=>s.buildingUid===e))return z(t,"Wait for the current job on that building to finish.","warn"),!1;const r=fs(n.kind,n.level),i={};for(const s of Mt){const o=r[s];o&&(i[s]=Math.floor(o*.25))}return Hc(t,i),t.buildings=t.buildings.filter(s=>s.uid!==e),z(t,`Dismantled a Level ${n.level} ${ve[n.kind].name}; recovered a quarter of its cost.`,"info"),!0}function rv(t,e,n,r){const i=t.buildings.find(s=>s.uid===e);return!i||i.island===n&&i.plot===r?!1:um(t.wavesCleared,mn(t),n)?qo(t.unlockedPlots,n,r)?t.buildings.some(s=>s.island===n&&s.plot===r)?(z(t,"That plot is occupied.","warn"),!1):(i.island=n,i.plot=r,z(t,`${ve[i.kind].name} redeployed.`,"info"),!0):(z(t,"That plot is still wilderness.","warn"),!1):(z(t,"That island is not open yet.","warn"),!1)}function nP(t,e){return e.kind==="command"?[]:t.buildings.filter(n=>n.uid!==e.uid&&n.kind===e.kind&&n.level===e.level)}function O0(t){return t.jobs.find(e=>e.type==="research")}function rP(t,e){if(!t.buildings.some(c=>c.kind==="research"))return z(t,"Build a Research Center first.","warn"),!1;if(O0(t))return z(t,"The Research Center is already running a project.","warn"),!1;const r=t.research[e]+1,i=v0(e,t.research);if(r>i)return z(t,`That track is capped at Level ${i} by the stair-step rule.`,"warn"),!1;if(mn(t)<r)return z(t,`Command Center Level ${r} is required for that research.`,"warn"),!1;const o=_0(e,r);if(!Ws(t,o))return z(t,"Not enough resources for that research.","warn"),!1;Hs(t,o);const l=Math.max(5,Math.round(y0(e,r)*(1-Rs(t,"build")*.5))),u=cm.find(c=>c.key===e);return t.jobs.push({id:Zr(),type:"research",label:`${u?u.name:e} → Lv ${r}`,startedAt:Date.now(),endsAt:Date.now()+l*1e3,duration:l,track:e,targetLevel:r}),z(t,`Research started: ${u?u.name:e} Level ${r} (${ot(l)}).`,"info"),!0}function L0(t,e){return t.jobs.find(n=>n.type==="train"&&n.branch===e)}function iP(t,e,n,r){const i=Ia(e);if(dm(t,e)<=0)return z(t,`Build a ${ve[i.kind].name} first.`,"warn"),!1;const o=fm(t,e);if(n<1||n>o)return z(t,`Tier ${n} is above this branch's ceiling (Tier ${o}).`,"warn"),!1;if(r<1||r>100)return!1;if(L0(t,e))return z(t,`The ${ve[i.kind].name} is already training.`,"warn"),!1;const l=D0(E0(n),r);if(!Ws(t,l))return z(t,"Not enough resources to train that many.","warn"),!1;Hs(t,l);const u=Math.max(2,Math.round(T0(n)*r*(1-x0(t))));return t.jobs.push({id:Zr(),type:"train",label:`${r}× ${i.unit} T${n}`,startedAt:Date.now(),endsAt:Date.now()+u*1e3,duration:u,branch:e,tier:n,count:r}),z(t,`Training ${r} ${i.unit} (Tier ${n}) — ${ot(u)}.`,"info"),!0}function sP(t,e,n){const r=String(n),i=t.troops[e][r]??0,s=fm(t,e);return n+1>s?(z(t,`Combination capped at Tier ${s}. Research Unit Force Combination or merge a higher ${Ia(e).name} building.`,"warn"),!1):i<2?(z(t,`Need 2 units at Tier ${n} to combine.`,"warn"),!1):(t.troops[e][r]=i-2,M0(t,e,n+1,1),z(t,`Combined two Tier ${n} ${Ia(e).unit} into one Tier ${n+1}.`,"ok"),!0)}function Pf(t){return t.jobs.filter(e=>e.type==="gather").length}function V0(t,e){return Math.round(BN(mn(t))*(1+Rs(t,"gather"))*e)}function oP(t,e,n){if(Pf(t)>=Jy)return z(t,`Both gathering parties are out. (${Jy} slots)`,"warn"),!1;const r=Math.max(30,Math.min(3600,Math.round(n))),i=V0(t,r);return t.jobs.push({id:Zr(),type:"gather",label:`${vn[e].name} gathering (${ot(r)})`,startedAt:Date.now(),endsAt:Date.now()+r*1e3,duration:r,res:e,amount:i}),z(t,`Gathering party sent for ${vn[e].name}: ${_e(i)} in ${ot(r)}.`,"info"),!0}function F0(t){return t.jobs.find(e=>e.type==="scout")}function xf(t,e){const n=t.zones.find(r=>r.id===e);return!n||n.revealed?!1:t.zones.some(r=>r.revealed&&FN(r).includes(e))}function aP(t,e){const n=t.zones.find(s=>s.id===e);if(!n||n.revealed)return!1;if(!xf(t,e))return z(t,"Scouts must move through revealed land first.","warn"),!1;if(F0(t))return z(t,"Your scout party is already in the field.","warn"),!1;const r=R0(n.depth);if(!Ws(t,r))return z(t,"Not enough supplies for that scouting run.","warn"),!1;Hs(t,r);const i=A0(n.depth);return t.jobs.push({id:Zr(),type:"scout",label:`Scouting ${n.name}`,startedAt:Date.now(),endsAt:Date.now()+i*1e3,duration:i,zoneId:e}),z(t,`Scouts sent toward ${n.name} (${ot(i)}).`,"info"),!0}function j0(t,e){const n=Math.max(0,Math.min(.9,e*(1-HN(t))));let r=0;for(const i of Ta)for(const s of Object.keys(t.troops[i.key])){const o=t.troops[i.key][s]??0;if(o<=0)continue;const l=Math.min(o,Math.round(o*n));l>0&&(t.troops[i.key][s]=o-l,r+=l)}return r}function lP(t,e){const n=t.zones.find(l=>l.id===e);if(!n||!n.revealed)return!1;if(_i(t)<=0)return z(t,"You have no troops to hunt with. Train some first.","warn"),!1;const r=k0(n.depth);if(!Ws(t,r))return z(t,"Not enough food for a hunting party.","warn"),!1;Hs(t,r);const i=C0(n.depth)*(.9+Math.random()*.2);if(nr(t)>=i){Hc(t,jN(n.depth)),n.hunts+=1,t.stats.kills+=1,t.stats.hunts+=1,mm(t,"combat",16+n.depth*18),z(t,`Cleared ${n.name} — the monster is down.`,"ok");const l=Math.min(.95,.35+n.depth*.12);if(n.depth>0&&Math.random()<l){const u=$N(n.depth,Math.random);t.gear.unshift(u),z(t,`Recovered ${u.name} (Tier ${u.tier}, ${u.slot}) from ${n.name}.`,"epic")}return!0}const o=j0(t,.18);return z(t,`Repelled from ${n.name} — lost ${o} unit${o===1?"":"s"}.`,"warn"),!1}function uP(t){if(_i(t)<=0)return z(t,"No army, no assault. Train troops first.","warn"),!1;const e=t.wavesCleared+1,n=I0(e),r=nr(t),i=.92+Math.random()*.16;if(r*i>=n){t.wavesCleared=e,Hc(t,MN(e)),t.unlockedPlots<kf&&(t.unlockedPlots+=1),t.stats.kills+=5,mm(t,"combat",18+e*10),z(t,`Wave ${e} broken. A new plot opens on the frontier.`,"epic");for(const o of Si)o.id>0&&t.wavesCleared===o.needWaves&&z(t,`${o.name} can now be reached at Command Center Level ${o.needHq}.`,"ok");return!0}const s=j0(t,.22);return z(t,`Wave ${e} held. Lost ${s} unit${s===1?"":"s"} — rebuild and try again.`,"warn"),!1}function cP(t,e){const n=t.gear.find(r=>r.id===e);return n?(t.equipped[n.slot]===n.id?(delete t.equipped[n.slot],z(t,`Unequipped ${n.name}.`,"info")):(t.equipped[n.slot]=n.id,z(t,`Equipped ${n.name}. Bonuses from the old ${n.slot} are gone.`,"ok")),!0):!1}function hP(t){const e={n:t.name,c:t.alliance.code,a:t.alliance.name,h:mn(t),p:Math.round(nr(t)),s:t.seed,t:Date.now()};return btoa(encodeURIComponent(JSON.stringify(e)))}function dP(t){try{let e=t.trim();if(!e||(e.includes("ally=")&&(e=new URL(e,"https://example.invalid/").searchParams.get("ally")??""),!e))return null;const n=decodeURIComponent(atob(e)),r=JSON.parse(n);return!r||typeof r.n!="string"||typeof r.c!="string"?null:r}catch{return null}}function fP(t){const e=hP(t);if(typeof window>"u")return e;const n=new URL(window.location.href);return n.searchParams.set("ally",e),n.toString()}function gm(t,e){const n=dP(e);if(!n)return z(t,"That banner code could not be read. Copy the whole link or code.","warn"),!1;n.c&&n.c!==t.alliance.code&&(t.alliance.code=n.c,n.a&&(t.alliance.name=n.a));const r=`${n.n}|${n.t}`;return t.alliance.members.some(i=>i.id===r)?(z(t,`${n.n} is already on this banner.`,"info"),!1):(t.alliance.members.unshift({id:r,name:n.n,hq:n.h,power:n.p,joinedAt:Date.now(),lastSupplyAt:0}),z(t,`${n.n} (HQ ${n.h}, ${_e(n.p)} power) joined ${t.alliance.name}.`,"epic"),!0)}const U0=30*60*1e3;function pP(t,e){const n=t.alliance.members.find(s=>s.id===e);if(!n)return!1;const r=U0-(Date.now()-n.lastSupplyAt);if(r>0)return z(t,`${n.name}'s next supply drop is ready in ${ot(r/1e3)}.`,"warn"),!1;n.lastSupplyAt=Date.now();const i={gold:Math.round(70+n.hq*22),wood:Math.round(60+n.hq*18),food:Math.round(45+n.hq*14)};return Hc(t,i),z(t,`${n.name} sent a supply drop.`,"ok"),!0}const _m="ironhold.save.v1";function mP(){try{const t=localStorage.getItem(_m);if(!t)return null;const e=JSON.parse(t);return!e||e.version!==lm||!Array.isArray(e.buildings)||!e.stats?null:e}catch{return null}}function bf(t){try{localStorage.setItem(_m,JSON.stringify(t))}catch{}}function gP(){try{localStorage.removeItem(_m)}catch{}}function Df(){try{return new URL(window.location.href).searchParams.get("ally")??null}catch{return null}}function _P(){try{const t=new URL(window.location.href);if(!t.searchParams.has("ally"))return;t.searchParams.delete("ally"),window.history.replaceState({},"",t.toString())}catch{}}function As({cost:t}){const e=Mt.filter(n=>(t[n]??0)>0);return e.length?g.jsx("span",{className:"cost",children:e.map(n=>g.jsxs("span",{className:"cost-chip",children:[g.jsx("span",{className:"ico",children:vn[n].icon}),_e(t[n]??0)]},n))}):g.jsx("span",{className:"muted",children:"free"})}function $0({value:t,max:e}){const n=Math.max(0,Math.min(100,t/Math.max(1e-6,e)*100));return g.jsx("div",{className:"bar",children:g.jsx("span",{style:{width:`${n}%`}})})}function ym({job:t}){const e=Date.now(),n=Math.max(0,(t.endsAt-e)/1e3),r=Math.max(0,t.duration-n);return g.jsxs("div",{className:"job",children:[g.jsxs("div",{className:"job-top",children:[g.jsx("span",{children:t.label}),g.jsx("span",{className:"num",children:ot(n)})]}),g.jsx($0,{value:r,max:t.duration})]})}function yt({children:t}){return g.jsx("p",{className:"hint",children:t})}function yP({s:t,act:e,island:n,setIsland:r,selectedUid:i,setSelectedUid:s,setTab:o}){const[l,u]=ae.useState(null),[c,d]=ae.useState(!1),[p,m]=ae.useState(!1),[E,k]=ae.useState(Xy[0]),x=mn(t),P=Si[n],S=pm(t),w=t.buildings.find(v=>v.uid===i)??null,R=w?nP(t,w):[],D=Ka(t.research),j=fs("goldmine",t.research.construction);function O(v){if(!qo(t.unlockedPlots,n,v))return;const I=t.buildings.find(A=>A.island===n&&A.plot===v);if(I){if(c&&w&&w.uid!==I.uid){e(A=>{rv(A,w.uid,n,v)}),d(!1);return}s(I.uid),d(!1),m(!1);return}if(c&&w){e(A=>{rv(A,w.uid,n,v)}),d(!1);return}u({island:n,plot:v})}const T=l?qo(t.unlockedPlots,l.island,l.plot):!1,y=Pf(t)>=2;return g.jsxs("section",{className:"stack",children:[g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:"Island Command"}),g.jsxs("div",{className:"meta-row",children:[g.jsxs("span",{className:"pill",children:["Crews ",P0(t),"/",Nf(t)]}),g.jsxs("span",{className:"pill",children:["Plots ",Math.min(t.unlockedPlots,kf),"/",kf]}),g.jsxs("span",{className:"pill",children:["HQ Lv ",x]})]})]}),g.jsx("div",{className:"island-tabs",children:Si.map(v=>{const I=um(t.wavesCleared,x,v.id);return g.jsxs("button",{className:`island-tab ${n===v.id?"active":""}`,onClick:()=>{r(v.id),s(null),d(!1)},title:I?v.name:`Needs Command Center Lv ${v.needHq} and ${v.needWaves} waves cleared`,children:[v.name,!I&&g.jsx("span",{className:"lock-tag",children:"🔒"})]},v.id)})}),g.jsx("div",{className:"island-grid",style:{gridTemplateColumns:`repeat(${P.cols}, minmax(0, 1fr))`},children:Array.from({length:P.cols*P.rows},(v,I)=>{const A=qo(t.unlockedPlots,n,I),N=t.buildings.find(Vt=>Vt.island===n&&Vt.plot===I);if(!A)return g.jsx("div",{className:"plot locked",title:"Wilderness — clear campaign waves to expand",children:g.jsx("span",{className:"ico",children:"🌫"})},I);if(!N)return g.jsx("button",{className:`plot empty ${c?"move":""}`,onClick:()=>O(I),title:"Empty plot — build here",children:g.jsx("span",{className:"plus",children:"+"})},I);const C=t.jobs.some(Vt=>Vt.type==="upgrade"&&Vt.buildingUid===N.uid),At=(w==null?void 0:w.uid)===N.uid,bn=!!w&&R.some(Vt=>Vt.uid===N.uid);return g.jsxs("button",{className:`plot built ${At?"sel":""} ${bn?"cand":""} ${C?"busy":""}`,onClick:()=>O(I),title:`${ve[N.kind].name} · Level ${N.level}`,children:[g.jsx("span",{className:"ico",children:ve[N.kind].icon}),g.jsx("span",{className:"lv",children:N.level})]},I)})}),g.jsx(yt,{children:"Tap an empty plot to build, a structure to manage it. Each campaign wave you break unlocks one more plot — space is the real limit, so merge deliberately."})]}),w&&g.jsxs("div",{className:"card detail",children:[g.jsxs("div",{className:"card-head",children:[g.jsxs("h2",{children:[ve[w.kind].icon," ",ve[w.kind].name," ",g.jsxs("span",{className:"pill",children:["Lv ",w.level]})]}),g.jsx("button",{className:"btn tiny ghost",onClick:()=>s(null),children:"Close"})]}),g.jsx("p",{className:"hint",children:ve[w.kind].blurb}),ve[w.kind].produces&&g.jsxs("p",{className:"kv",children:["Producing ",g.jsx("b",{children:_e(m0(w.kind,w.level)*60)})," ",vn[ve[w.kind].produces].name," per minute"]}),g.jsx("div",{className:"form-row",children:w.kind!=="command"&&w.level>=t.research.construction?g.jsxs("span",{className:"muted",children:["Structure-capped at Lv ",t.research.construction,". Merge to go higher."]}):g.jsxs(g.Fragment,{children:[g.jsxs("span",{className:"muted",children:["Upgrade to Lv ",w.level+1," · ",ot(p0(w.kind,w.level+1)),Rs(t,"build")>0?` (hero −${Math.round(Rs(t,"build")*100)}%)`:""]}),g.jsx(As,{cost:fs(w.kind,w.level+1)}),g.jsx("button",{className:"btn primary",onClick:()=>e(v=>{ZN(v,w.uid)}),children:"Upgrade"})]})}),w.kind==="command"&&w.level<80&&g.jsxs(yt,{children:["Next Command Center level needs ",S0(w.level+1)," campaign waves cleared."]}),w.kind!=="command"&&g.jsxs("div",{className:"form-row",children:[g.jsxs("span",{className:"muted",children:["Merge ceiling Lv ",D," · ",R.length," matching partner",R.length===1?"":"s"]}),g.jsxs("button",{className:"btn",disabled:!R.length||w.level+1>D,onClick:()=>e(v=>{eP(v,w.uid)}),children:["Merge 2 → Lv ",w.level+1]})]}),(w.kind==="barracks"||w.kind==="shipyard"||w.kind==="airbase")&&g.jsxs("div",{className:"form-row",children:[g.jsx("button",{className:"btn",onClick:()=>o("troops"),children:"Training grounds →"}),g.jsx("span",{className:"muted",children:"Deployed troops come from this building's level."})]}),w.kind==="research"&&g.jsx("div",{className:"form-row",children:g.jsx("button",{className:"btn",onClick:()=>o("research"),children:"Research Center →"})}),w.kind!=="command"&&g.jsxs("div",{className:"form-row",children:[g.jsx("button",{className:`btn tiny ${c?"primary":"ghost"}`,onClick:()=>{d(v=>!v)},children:c?"Pick a plot…":"Relocate"}),g.jsx("button",{className:`btn tiny ${p?"danger":"ghost"}`,onClick:()=>{if(!p){m(!0);return}e(v=>{tP(v,w.uid)}),s(null),m(!1)},children:p?"Confirm dismantle":"Dismantle"})]})]}),g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:"Gathering Parties"}),g.jsxs("span",{className:"pill",children:[Pf(t),"/2 out"]})]}),g.jsx(yt,{children:"Every resource can be gathered at any point in the game — nothing is locked behind a purchase or a level. Time spent gathering is also how your gatherer hero levels up."}),g.jsx("div",{className:"seg",children:Xy.map(v=>g.jsx("button",{className:`seg-btn ${E===v?"active":""}`,onClick:()=>k(v),children:ot(v)},v))}),g.jsx("div",{className:"gather-row",children:Mt.map(v=>g.jsxs("button",{className:"gather-btn",disabled:y,onClick:()=>e(I=>{oP(I,v,E)}),children:[g.jsx("span",{className:"ico",children:vn[v].icon}),g.jsx("span",{children:vn[v].name}),g.jsxs("b",{children:["+",_e(V0(t,E))]})]},v))}),g.jsxs("div",{className:"meta-row",children:[Mt.map(v=>g.jsxs("span",{className:"pill",children:[vn[v].icon," ",_e(S[v]*3600),"/h"]},v)),g.jsxs("span",{className:"pill",children:["Build cost from Lv ",t.research.construction,": ",_e(j.gold??0),"🪙"]})]})]}),l&&T&&g.jsx("div",{className:"modal-backdrop",onClick:()=>u(null),children:g.jsxs("div",{className:"modal",onClick:v=>v.stopPropagation(),children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:"Raise a structure"}),g.jsx("button",{className:"btn tiny ghost",onClick:()=>u(null),children:"Close"})]}),g.jsxs(yt,{children:["New structures start at your Structure Level (Lv ",t.research.construction,"). To go above it you merge two identical buildings — never buy your way up."]}),g.jsx("div",{className:"build-grid",children:f0.map(v=>{const I=fs(v,t.research.construction),A=Mt.every(N=>t.resources[N]>=(I[N]??0));return g.jsxs("button",{className:`build-card ${A?"":"off"}`,onClick:()=>e(N=>{JN(N,v,l.island,l.plot)}),children:[g.jsx("span",{className:"ico",children:ve[v].icon}),g.jsx("b",{children:ve[v].name}),g.jsxs("span",{className:"lv-tag",children:["Lv ",t.research.construction]}),g.jsx(As,{cost:I})]},v)})})]})})]})}function vP({s:t,act:e}){const n=O0(t),r=mn(t);return g.jsxs("div",{className:"stack",children:[g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:"Three-tier progression"}),g.jsxs("span",{className:"pill",children:["HQ Lv ",r]})]}),g.jsxs("div",{className:"chain",children:[g.jsxs("div",{children:[g.jsx("span",{className:"muted",children:"Structure"}),g.jsxs("b",{children:["Lv ",t.research.construction]})]}),g.jsx("span",{className:"arrow",children:"→"}),g.jsxs("div",{children:[g.jsx("span",{className:"muted",children:"Merge ceiling"}),g.jsxs("b",{children:["Lv ",Ka(t.research)]})]}),g.jsx("span",{className:"arrow",children:"→"}),g.jsxs("div",{children:[g.jsx("span",{className:"muted",children:"Troop tier ceiling"}),g.jsxs("b",{children:["Tier ",g0(t.research)]})]})]}),g.jsxs(yt,{children:["New structures are built at the Structure Level. Merging can push a structure at most ",zc," levels above that, and the Merge Level track caps it further. Troop combination follows the same stair-step: merge ceiling + ",Wc,". Nothing here can be purchased."]})]}),cm.map(i=>{const s=t.research[i.key],o=s+1,l=v0(i.key,t.research),u=o>l,c=r<o,d=(n==null?void 0:n.track)===i.key;return g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsxs("h2",{children:[i.icon," ",i.name]}),g.jsxs("span",{className:"pill",children:["Level ",s]})]}),g.jsx(yt,{children:i.blurb}),g.jsxs("div",{className:"form-row",children:[g.jsx(As,{cost:_0(i.key,o)}),g.jsx("span",{className:"muted",children:ot(y0(i.key,o))}),g.jsxs("span",{className:"muted",children:["Needs HQ Lv ",o]}),g.jsxs("button",{className:"btn primary",disabled:!!n||u||c,onClick:()=>e(p=>{rP(p,i.key)}),children:["Research Lv ",o]})]}),u&&g.jsxs("p",{className:"warn",children:["Capped at Level ",l," by the stair-step rule."]}),!u&&c&&g.jsxs("p",{className:"warn",children:["Command Center must reach Level ",o," first."]}),d&&n&&g.jsx(ym,{job:n})]},i.key)})]})}function wP({s:t,act:e}){const[n,r]=ae.useState({army:{tier:1,count:10},navy:{tier:1,count:5},air:{tier:1,count:5}}),i=(s,o)=>{r(l=>({...l,[s]:{...l[s],...o}}))};return g.jsxs("div",{className:"stack",children:[Ta.map(s=>{const o=fm(t,s.key),l=dm(t,s.key),u=L0(t,s.key),c=Math.min(n[s.key].tier,Math.max(1,o)),d=Math.max(1,n[s.key].count),p=D0(E0(c),d),m=Math.max(2,Math.round(T0(c)*d*(1-x0(t)))),E=GN(t,s.key);return g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsxs("h2",{children:[s.icon," ",s.name]}),g.jsxs("span",{className:"pill",children:[ve[s.kind].name," Lv ",l]})]}),g.jsxs(yt,{children:[s.blurb," Tier ceiling: ",g.jsxs("b",{children:["Tier ",o]})," — set by this building's level + 3, capped by Unit Force Combination research."]}),l===0?g.jsxs("p",{className:"warn",children:["No ",ve[s.kind].name," yet — raise one on an island plot."]}):g.jsxs(g.Fragment,{children:[g.jsxs("div",{className:"form-row",children:[g.jsxs("label",{children:["Tier",g.jsx("select",{value:c,onChange:k=>i(s.key,{tier:Number(k.target.value)}),children:Array.from({length:Math.max(1,o)},(k,x)=>x+1).map(k=>g.jsxs("option",{value:k,children:["Tier ",k]},k))})]}),g.jsxs("label",{children:["Count",g.jsx("input",{type:"number",min:1,max:100,value:d,onChange:k=>i(s.key,{count:Number(k.target.value)})})]}),g.jsx("span",{className:"muted",children:ot(m)}),g.jsx(As,{cost:p}),g.jsx("button",{className:"btn primary",disabled:!!u,onClick:()=>e(k=>{iP(k,s.key,c,d)}),children:"Train"})]}),u&&g.jsx(ym,{job:u}),E.length===0?g.jsxs("p",{className:"muted",children:["No ",s.unit," in the field yet."]}):g.jsx("div",{className:"stack-list",children:E.map(k=>{const x=t.troops[s.key][String(k)]??0,P=x>=2&&k+1<=o;return g.jsxs("div",{className:"row-line",children:[g.jsxs("span",{className:"tag",children:["Tier ",k]}),g.jsxs("span",{children:[_e(x),"× ",s.unit]}),g.jsxs("span",{className:"muted",children:[_e(x*w0(k,s.mul))," power"]}),g.jsxs("button",{className:"btn tiny",disabled:!P,onClick:()=>e(S=>{sP(S,s.key,k)}),children:["Combine 2 → T",k+1]})]},k)})})]})]},s.key)}),g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:"Army totals"}),g.jsxs("span",{className:"pill",children:[_e(nr(t))," power"]})]}),g.jsxs(yt,{children:["Battle power ",_e(nr(t))," — troop power ",_e(_i(t))," raised by hero and gear bonuses. Combining two units of the same tier makes one unit of the next tier; it is never instant power you can buy, only time you convert."]})]})]})}const EP=["weapon","armor","relic"];function TP({s:t,act:e}){return g.jsxs("div",{className:"stack",children:[g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:"Heroes"}),g.jsxs("span",{className:"pill",children:["Gathered ",ot(t.stats.gatherSeconds)," · ",t.stats.kills," kills"]})]}),g.jsx(yt,{children:"Heroes grow from the time you spend gathering and the fights you take. The banner's next hero only joins once you have put that time in — there is no other way to get them."}),g.jsx("div",{className:"hero-grid",children:Qa.map(n=>{const r=t.heroes.find(o=>o.id===n.id);if(!r)return null;const i=qN(t,n.id),s=Af(r.level);return g.jsxs("div",{className:`hero-card ${i?"":"locked"}`,children:[g.jsxs("div",{className:"hero-top",children:[g.jsx("b",{children:n.name}),g.jsx("span",{className:"tag",children:n.title})]}),i?g.jsxs(g.Fragment,{children:[g.jsxs("div",{className:"row-line",children:[g.jsxs("span",{children:["Level ",r.level]}),g.jsxs("span",{className:"muted",children:[_e(r.xp)," / ",_e(s)," XP"]})]}),g.jsx($0,{value:r.xp,max:s}),g.jsx("p",{className:"hint",children:n.blurb}),g.jsxs("p",{className:"hint",children:["Currently ",g.jsxs("b",{children:["+",Math.round(r.level*N0[n.focus]*100),"%"]})," ",n.focus==="combat"?"battle power":n.focus==="gather"?"gathering yield":"build speed"]})]}):g.jsxs(g.Fragment,{children:[g.jsx("p",{className:"warn",children:"Not yet joined."}),g.jsxs("p",{className:"hint",children:["Requires ",ot(n.reqGatherSeconds)," total gathering and ",n.reqKills," kills."]})]})]},n.id)})})]}),g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:"Gear"}),g.jsxs("span",{className:"pill",children:[t.gear.length," recovered"]})]}),g.jsx(yt,{children:"Gear only comes from exploring the frontier and killing what lives there. The deeper the zone, the better the find — nothing drops gear from a shop."}),g.jsx("div",{className:"slot-row",children:EP.map(n=>{const r=t.equipped[n],i=t.gear.find(s=>s.id===r);return g.jsxs("div",{className:"slot",children:[g.jsx("span",{className:"muted",children:n}),i?g.jsx("b",{children:i.name}):g.jsx("span",{className:"muted",children:"empty"})]},n)})}),t.gear.length===0?g.jsx("p",{className:"muted",children:"No gear yet. Scout the map, then hunt a monster."}):g.jsx("div",{className:"gear-list",children:t.gear.slice(0,30).map(n=>{const r=t.equipped[n.slot]===n.id;return g.jsxs("div",{className:`gear ${r?"on":""}`,children:[g.jsxs("div",{children:[g.jsx("b",{children:n.name})," ",g.jsxs("span",{className:"tag",children:["T",n.tier," ",n.slot]})]}),g.jsxs("div",{className:"muted",children:[n.atk?`+${n.atk}% power `:"",n.gather?`+${n.gather}% gather `:"",n.build?`+${n.build}% build speed `:"",n.prod?`+${n.prod}% production`:""]}),g.jsx("button",{className:"btn tiny",onClick:()=>e(i=>{cP(i,n.id)}),children:r?"Unequip":"Equip"})]},n.id)})})]})]})}function IP({s:t,act:e}){const[n,r]=ae.useState("4:3"),i=t.zones.find(d=>d.id===n)??t.zones[0],s=F0(t),o=nr(t),l=t.wavesCleared+1,u=t.zones.filter(d=>d.revealed).length,c=xf(t,i.id);return g.jsxs("div",{className:"stack",children:[g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:"Campaign"}),g.jsxs("span",{className:"pill",children:["Wave ",l," ahead"]})]}),g.jsx(yt,{children:"Breaking a wave opens one more building plot, and the Command Center cannot outlevel your cleared waves. Power is compared with a little luck — losing means troops."}),g.jsxs("div",{className:"meta-row",children:[g.jsxs("span",{className:"pill",children:["Cleared ",t.wavesCleared]}),g.jsxs("span",{className:"pill",children:["Enemy power ",_e(I0(l))]}),g.jsxs("span",{className:"pill",children:["Your power ",_e(o)]})]}),g.jsxs("div",{className:"form-row",children:[g.jsxs("button",{className:"btn primary",disabled:_i(t)<=0,onClick:()=>e(d=>{uP(d)}),children:["Assault Wave ",l]}),_i(t)<=0&&g.jsx("span",{className:"muted",children:"Train troops first."})]})]}),g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:"Frontier"}),g.jsxs("span",{className:"pill",children:[u,"/",t.zones.length," charted"]})]}),g.jsx(yt,{children:"Scout outward from charted land. Deeper zones hide stronger monsters, and they are the only place gear comes from."}),g.jsx("div",{className:"zone-grid",style:{gridTemplateColumns:`repeat(${Rf}, minmax(0, 1fr))`},children:t.zones.map(d=>g.jsx("button",{className:`zone d${d.depth} ${d.revealed?"revealed":""} ${xf(t,d.id)?"reachable":""} ${i.id===d.id?"sel":""}`,onClick:()=>r(d.id),title:`${d.name} · depth ${d.depth}`,children:d.revealed?d.hunts>0?"⚔":"☠":"🌫"},d.id))}),g.jsxs("div",{className:"zone-panel",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h3",{children:i.name}),g.jsxs("span",{className:"pill",children:["Depth ",i.depth]})]}),g.jsxs("div",{className:"meta-row",children:[g.jsxs("span",{className:"pill",children:["Monster power ",_e(C0(i.depth))]}),g.jsxs("span",{className:"pill",children:["Gear tier ",Math.min(7,1+i.depth),"–",Math.min(7,2+i.depth)]}),g.jsxs("span",{className:"pill",children:["Hunts ",i.hunts]})]}),i.revealed?g.jsxs(g.Fragment,{children:[g.jsxs("p",{className:"hint",children:["Hunt the monster here for loot",i.depth>0?" and a chance at gear":"",". Your power ",_e(o),"."]}),g.jsxs("div",{className:"form-row",children:[g.jsx(As,{cost:k0(i.depth)}),g.jsx("button",{className:"btn primary",disabled:_i(t)<=0,onClick:()=>e(d=>{lP(d,i.id)}),children:"Hunt"})]})]}):g.jsxs(g.Fragment,{children:[g.jsx("p",{className:"hint",children:c?"Send scouts to chart this zone.":"Chart an adjacent zone first."}),g.jsxs("div",{className:"form-row",children:[g.jsx(As,{cost:R0(i.depth)}),g.jsx("span",{className:"muted",children:ot(A0(i.depth))}),g.jsx("button",{className:"btn",disabled:!c||!!s,onClick:()=>e(d=>{aP(d,i.id)}),children:"Scout"})]}),(s==null?void 0:s.zoneId)===i.id&&g.jsx(ym,{job:s})]})]})]}),g.jsxs("div",{className:"card",children:[g.jsx("h2",{children:"Islands"}),g.jsx("div",{className:"meta-row",children:Si.map(d=>g.jsxs("span",{className:"pill",children:[d.name," · HQ ",d.needHq," / ",d.needWaves," waves"]},d.id))}),g.jsx(yt,{children:"Three islands, 24 plots each. Waves unlock plots in order; islands two and three also need a stronger Command Center."})]})]})}function SP({s:t,act:e}){const[n,r]=ae.useState(""),[i,s]=ae.useState(!1),[o,l]=ae.useState(!1),u=fP(t);async function c(){try{await navigator.clipboard.writeText(u),s(!0),window.setTimeout(()=>s(!1),1600)}catch{s(!1)}}return g.jsxs("div",{className:"stack",children:[g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:t.alliance.name}),g.jsxs("span",{className:"pill",children:["Code ",t.alliance.code]})]}),g.jsx(yt,{children:"A banner is your group of friends on this frontier. Anyone who opens your invite link joins the same banner and the same world seed. Send their link back the other way so your roster lists them too. This is asynchronous co-op — no accounts, no payments, no server to rent."}),g.jsxs("div",{className:"copy-row",children:[g.jsx("input",{className:"link-input",readOnly:!0,value:u,onFocus:d=>d.currentTarget.select()}),g.jsx("button",{className:"btn primary",onClick:c,children:i?"Copied":"Copy invite link"})]}),g.jsxs("div",{className:"meta-row",children:[g.jsxs("span",{className:"pill",children:["Banner power ",_e(KN(t))]}),g.jsxs("span",{className:"pill",children:["Members ",t.alliance.members.length+1]})]})]}),g.jsxs("div",{className:"card",children:[g.jsx("h2",{children:"Add a friend"}),g.jsx(yt,{children:"Paste the invite link or code a friend sent you. Their card joins your roster, and every 30 minutes they can send you a supply drop."}),g.jsxs("form",{className:"copy-row",onSubmit:d=>{d.preventDefault(),e(p=>{gm(p,n)}),r("")},children:[g.jsx("input",{className:"link-input",placeholder:"Paste invite link or banner code",value:n,onChange:d=>r(d.target.value)}),g.jsx("button",{className:"btn",type:"submit",disabled:!n.trim(),children:"Join banner"})]})]}),g.jsxs("div",{className:"card",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:"Roster"}),g.jsxs("span",{className:"pill",children:[t.name," (you)"]})]}),g.jsxs("div",{className:"member you",children:[g.jsx("b",{children:t.name}),g.jsxs("span",{children:["HQ ",mn(t)]}),g.jsxs("span",{children:[_e(nr(t))," power"]})]}),t.alliance.members.length===0&&g.jsx("p",{className:"muted",children:"No friends yet — share your invite link."}),t.alliance.members.map(d=>{const p=U0-(Date.now()-d.lastSupplyAt);return g.jsxs("div",{className:"member",children:[g.jsx("b",{children:d.name}),g.jsxs("span",{children:["HQ ",d.hq]}),g.jsxs("span",{children:[_e(d.power)," power"]}),g.jsx("button",{className:"btn tiny",disabled:p>0,onClick:()=>e(m=>{pP(m,d.id)}),children:p>0?`Supply in ${ot(p/1e3)}`:"Supply drop"})]},d.id)})]}),g.jsxs("div",{className:"card",children:[g.jsx("h2",{children:"Fair play"}),g.jsxs("ul",{className:"feature-list",children:[g.jsx("li",{children:"No VIP tiers, no packages, no currency bundles, no paid boosts. There is no shop at all."}),g.jsx("li",{children:"Power comes from troops, and troops come from time plus the skill of your merge decisions."}),g.jsx("li",{children:"Every resource is gatherable from the first minute; gear only drops from ground you explore."})]})]}),g.jsxs("div",{className:"card",children:[g.jsx("h2",{children:"Danger zone"}),g.jsx(yt,{children:"Start over with a fresh island. This deletes the local save in this browser."}),g.jsx("button",{className:`btn tiny ${o?"danger":"ghost"}`,onClick:()=>{if(!o){l(!0);return}gP(),window.location.reload()},children:o?"Confirm wipe":"Reset banner"})]})]})}var iv={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const B0={NODE_ADMIN:!1,SDK_VERSION:"${JSCORE_VERSION}"};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const U=function(t,e){if(!t)throw qs(e)},qs=function(t){return new Error("Firebase Database ("+B0.SDK_VERSION+") INTERNAL ASSERT FAILED: "+t)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const z0=function(t){const e=[];let n=0;for(let r=0;r<t.length;r++){let i=t.charCodeAt(r);i<128?e[n++]=i:i<2048?(e[n++]=i>>6|192,e[n++]=i&63|128):(i&64512)===55296&&r+1<t.length&&(t.charCodeAt(r+1)&64512)===56320?(i=65536+((i&1023)<<10)+(t.charCodeAt(++r)&1023),e[n++]=i>>18|240,e[n++]=i>>12&63|128,e[n++]=i>>6&63|128,e[n++]=i&63|128):(e[n++]=i>>12|224,e[n++]=i>>6&63|128,e[n++]=i&63|128)}return e},CP=function(t){const e=[];let n=0,r=0;for(;n<t.length;){const i=t[n++];if(i<128)e[r++]=String.fromCharCode(i);else if(i>191&&i<224){const s=t[n++];e[r++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){const s=t[n++],o=t[n++],l=t[n++],u=((i&7)<<18|(s&63)<<12|(o&63)<<6|l&63)-65536;e[r++]=String.fromCharCode(55296+(u>>10)),e[r++]=String.fromCharCode(56320+(u&1023))}else{const s=t[n++],o=t[n++];e[r++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},vm={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(t,e){if(!Array.isArray(t))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let i=0;i<t.length;i+=3){const s=t[i],o=i+1<t.length,l=o?t[i+1]:0,u=i+2<t.length,c=u?t[i+2]:0,d=s>>2,p=(s&3)<<4|l>>4;let m=(l&15)<<2|c>>6,E=c&63;u||(E=64,o||(m=64)),r.push(n[d],n[p],n[m],n[E])}return r.join("")},encodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(t):this.encodeByteArray(z0(t),e)},decodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(t):CP(this.decodeStringToByteArray(t,e))},decodeStringToByteArray(t,e){this.init_();const n=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let i=0;i<t.length;){const s=n[t.charAt(i++)],l=i<t.length?n[t.charAt(i)]:0;++i;const c=i<t.length?n[t.charAt(i)]:64;++i;const p=i<t.length?n[t.charAt(i)]:64;if(++i,s==null||l==null||c==null||p==null)throw new kP;const m=s<<2|l>>4;if(r.push(m),c!==64){const E=l<<4&240|c>>2;if(r.push(E),p!==64){const k=c<<6&192|p;r.push(k)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let t=0;t<this.ENCODED_VALS.length;t++)this.byteToCharMap_[t]=this.ENCODED_VALS.charAt(t),this.charToByteMap_[this.byteToCharMap_[t]]=t,this.byteToCharMapWebSafe_[t]=this.ENCODED_VALS_WEBSAFE.charAt(t),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[t]]=t,t>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(t)]=t,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(t)]=t)}}};class kP extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const W0=function(t){const e=z0(t);return vm.encodeByteArray(e,!0)},Ku=function(t){return W0(t).replace(/\./g,"")},Qu=function(t){try{return vm.decodeString(t,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function RP(t){return H0(void 0,t)}function H0(t,e){if(!(e instanceof Object))return e;switch(e.constructor){case Date:const n=e;return new Date(n.getTime());case Object:t===void 0&&(t={});break;case Array:t=[];break;default:return e}for(const n in e)!e.hasOwnProperty(n)||!AP(n)||(t[n]=H0(t[n],e[n]));return t}function AP(t){return t!=="__proto__"}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function NP(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const PP=()=>NP().__FIREBASE_DEFAULTS__,xP=()=>{if(typeof process>"u"||typeof iv>"u")return;const t=iv.__FIREBASE_DEFAULTS__;if(t)return JSON.parse(t)},bP=()=>{if(typeof document>"u")return;let t;try{t=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=t&&Qu(t[1]);return e&&JSON.parse(e)},qc=()=>{try{return PP()||xP()||bP()}catch(t){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${t}`);return}},q0=t=>{var e,n;return(n=(e=qc())===null||e===void 0?void 0:e.emulatorHosts)===null||n===void 0?void 0:n[t]},G0=t=>{const e=q0(t);if(!e)return;const n=e.lastIndexOf(":");if(n<=0||n+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(n+1),10);return e[0]==="["?[e.substring(1,n-1),r]:[e.substring(0,n),r]},K0=()=>{var t;return(t=qc())===null||t===void 0?void 0:t.config},Q0=t=>{var e;return(e=qc())===null||e===void 0?void 0:e[`_${t}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gc{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}wrapCallback(e){return(n,r)=>{n?this.reject(n):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(n):e(n,r))}}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Y0(t,e){if(t.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const n={alg:"none",type:"JWT"},r=e||"demo-project",i=t.iat||0,s=t.sub||t.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o=Object.assign({iss:`https://securetoken.google.com/${r}`,aud:r,iat:i,exp:i+3600,auth_time:i,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}}},t);return[Ku(JSON.stringify(n)),Ku(JSON.stringify(o)),""].join(".")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wt(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function wm(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(wt())}function DP(){var t;const e=(t=qc())===null||t===void 0?void 0:t.forceEnvironment;if(e==="node")return!0;if(e==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function MP(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function OP(){const t=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof t=="object"&&t.id!==void 0}function X0(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function LP(){const t=wt();return t.indexOf("MSIE ")>=0||t.indexOf("Trident/")>=0}function VP(){return B0.NODE_ADMIN===!0}function FP(){return!DP()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function jP(){try{return typeof indexedDB=="object"}catch{return!1}}function UP(){return new Promise((t,e)=>{try{let n=!0;const r="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(r);i.onsuccess=()=>{i.result.close(),n||self.indexedDB.deleteDatabase(r),t(!0)},i.onupgradeneeded=()=>{n=!1},i.onerror=()=>{var s;e(((s=i.error)===null||s===void 0?void 0:s.message)||"")}}catch(n){e(n)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $P="FirebaseError";class ur extends Error{constructor(e,n,r){super(n),this.code=e,this.customData=r,this.name=$P,Object.setPrototypeOf(this,ur.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Ya.prototype.create)}}class Ya{constructor(e,n,r){this.service=e,this.serviceName=n,this.errors=r}create(e,...n){const r=n[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?BP(s,r):"Error",l=`${this.serviceName}: ${o} (${i}).`;return new ur(i,l,r)}}function BP(t,e){return t.replace(zP,(n,r)=>{const i=e[r];return i!=null?String(i):`<${r}?>`})}const zP=/\{\$([^}]+)}/g;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Sa(t){return JSON.parse(t)}function Be(t){return JSON.stringify(t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const J0=function(t){let e={},n={},r={},i="";try{const s=t.split(".");e=Sa(Qu(s[0])||""),n=Sa(Qu(s[1])||""),i=s[2],r=n.d||{},delete n.d}catch{}return{header:e,claims:n,data:r,signature:i}},WP=function(t){const e=J0(t),n=e.claims;return!!n&&typeof n=="object"&&n.hasOwnProperty("iat")},HP=function(t){const e=J0(t).claims;return typeof e=="object"&&e.admin===!0};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cr(t,e){return Object.prototype.hasOwnProperty.call(t,e)}function Ns(t,e){if(Object.prototype.hasOwnProperty.call(t,e))return t[e]}function Mf(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}function Yu(t,e,n){const r={};for(const i in t)Object.prototype.hasOwnProperty.call(t,i)&&(r[i]=e.call(n,t[i],i,t));return r}function Xu(t,e){if(t===e)return!0;const n=Object.keys(t),r=Object.keys(e);for(const i of n){if(!r.includes(i))return!1;const s=t[i],o=e[i];if(sv(s)&&sv(o)){if(!Xu(s,o))return!1}else if(s!==o)return!1}for(const i of r)if(!n.includes(i))return!1;return!0}function sv(t){return t!==null&&typeof t=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gs(t){const e=[];for(const[n,r]of Object.entries(t))Array.isArray(r)?r.forEach(i=>{e.push(encodeURIComponent(n)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(n)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qP{constructor(){this.chain_=[],this.buf_=[],this.W_=[],this.pad_=[],this.inbuf_=0,this.total_=0,this.blockSize=512/8,this.pad_[0]=128;for(let e=1;e<this.blockSize;++e)this.pad_[e]=0;this.reset()}reset(){this.chain_[0]=1732584193,this.chain_[1]=4023233417,this.chain_[2]=2562383102,this.chain_[3]=271733878,this.chain_[4]=3285377520,this.inbuf_=0,this.total_=0}compress_(e,n){n||(n=0);const r=this.W_;if(typeof e=="string")for(let p=0;p<16;p++)r[p]=e.charCodeAt(n)<<24|e.charCodeAt(n+1)<<16|e.charCodeAt(n+2)<<8|e.charCodeAt(n+3),n+=4;else for(let p=0;p<16;p++)r[p]=e[n]<<24|e[n+1]<<16|e[n+2]<<8|e[n+3],n+=4;for(let p=16;p<80;p++){const m=r[p-3]^r[p-8]^r[p-14]^r[p-16];r[p]=(m<<1|m>>>31)&4294967295}let i=this.chain_[0],s=this.chain_[1],o=this.chain_[2],l=this.chain_[3],u=this.chain_[4],c,d;for(let p=0;p<80;p++){p<40?p<20?(c=l^s&(o^l),d=1518500249):(c=s^o^l,d=1859775393):p<60?(c=s&o|l&(s|o),d=2400959708):(c=s^o^l,d=3395469782);const m=(i<<5|i>>>27)+c+u+d+r[p]&4294967295;u=l,l=o,o=(s<<30|s>>>2)&4294967295,s=i,i=m}this.chain_[0]=this.chain_[0]+i&4294967295,this.chain_[1]=this.chain_[1]+s&4294967295,this.chain_[2]=this.chain_[2]+o&4294967295,this.chain_[3]=this.chain_[3]+l&4294967295,this.chain_[4]=this.chain_[4]+u&4294967295}update(e,n){if(e==null)return;n===void 0&&(n=e.length);const r=n-this.blockSize;let i=0;const s=this.buf_;let o=this.inbuf_;for(;i<n;){if(o===0)for(;i<=r;)this.compress_(e,i),i+=this.blockSize;if(typeof e=="string"){for(;i<n;)if(s[o]=e.charCodeAt(i),++o,++i,o===this.blockSize){this.compress_(s),o=0;break}}else for(;i<n;)if(s[o]=e[i],++o,++i,o===this.blockSize){this.compress_(s),o=0;break}}this.inbuf_=o,this.total_+=n}digest(){const e=[];let n=this.total_*8;this.inbuf_<56?this.update(this.pad_,56-this.inbuf_):this.update(this.pad_,this.blockSize-(this.inbuf_-56));for(let i=this.blockSize-1;i>=56;i--)this.buf_[i]=n&255,n/=256;this.compress_(this.buf_);let r=0;for(let i=0;i<5;i++)for(let s=24;s>=0;s-=8)e[r]=this.chain_[i]>>s&255,++r;return e}}function GP(t,e){const n=new KP(t,e);return n.subscribe.bind(n)}class KP{constructor(e,n){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=n,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(n=>{n.next(e)})}error(e){this.forEachObserver(n=>{n.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,n,r){let i;if(e===void 0&&n===void 0&&r===void 0)throw new Error("Missing Observer.");QP(e,["next","error","complete"])?i=e:i={next:e,error:n,complete:r},i.next===void 0&&(i.next=md),i.error===void 0&&(i.error=md),i.complete===void 0&&(i.complete=md);const s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let n=0;n<this.observers.length;n++)this.sendOne(n,e)}sendOne(e,n){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{n(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function QP(t,e){if(typeof t!="object"||t===null)return!1;for(const n of e)if(n in t&&typeof t[n]=="function")return!0;return!1}function md(){}function Em(t,e){return`${t} failed: ${e} argument `}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const YP=function(t){const e=[];let n=0;for(let r=0;r<t.length;r++){let i=t.charCodeAt(r);if(i>=55296&&i<=56319){const s=i-55296;r++,U(r<t.length,"Surrogate pair missing trail surrogate.");const o=t.charCodeAt(r)-56320;i=65536+(s<<10)+o}i<128?e[n++]=i:i<2048?(e[n++]=i>>6|192,e[n++]=i&63|128):i<65536?(e[n++]=i>>12|224,e[n++]=i>>6&63|128,e[n++]=i&63|128):(e[n++]=i>>18|240,e[n++]=i>>12&63|128,e[n++]=i>>6&63|128,e[n++]=i&63|128)}return e},Kc=function(t){let e=0;for(let n=0;n<t.length;n++){const r=t.charCodeAt(n);r<128?e++:r<2048?e+=2:r>=55296&&r<=56319?(e+=4,n++):e+=3}return e};/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Je(t){return t&&t._delegate?t._delegate:t}class zr{constructor(e,n,r){this.name=e,this.instanceFactory=n,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const oi="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XP{constructor(e,n){this.name=e,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const n=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(n)){const r=new Gc;if(this.instancesDeferred.set(n,r),this.isInitialized(n)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:n});i&&r.resolve(i)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(e){var n;const r=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),i=(n=e==null?void 0:e.optional)!==null&&n!==void 0?n:!1;if(this.isInitialized(r)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:r})}catch(s){if(i)return null;throw s}else{if(i)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(ZP(e))try{this.getOrInitializeService({instanceIdentifier:oi})}catch{}for(const[n,r]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(n);try{const s=this.getOrInitializeService({instanceIdentifier:i});r.resolve(s)}catch{}}}}clearInstance(e=oi){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...e.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=oi){return this.instances.has(e)}getOptions(e=oi){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:n={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:r,options:n});for(const[s,o]of this.instancesDeferred.entries()){const l=this.normalizeInstanceIdentifier(s);r===l&&o.resolve(i)}return i}onInit(e,n){var r;const i=this.normalizeInstanceIdentifier(n),s=(r=this.onInitCallbacks.get(i))!==null&&r!==void 0?r:new Set;s.add(e),this.onInitCallbacks.set(i,s);const o=this.instances.get(i);return o&&e(o,i),()=>{s.delete(e)}}invokeOnInitCallbacks(e,n){const r=this.onInitCallbacks.get(n);if(r)for(const i of r)try{i(e,n)}catch{}}getOrInitializeService({instanceIdentifier:e,options:n={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:JP(e),options:n}),this.instances.set(e,r),this.instancesOptions.set(e,n),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=oi){return this.component?this.component.multipleInstances?e:oi:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function JP(t){return t===oi?void 0:t}function ZP(t){return t.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class e1{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const n=this.getProvider(e.name);if(n.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);n.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const n=new XP(e,this);return this.providers.set(e,n),n}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ie;(function(t){t[t.DEBUG=0]="DEBUG",t[t.VERBOSE=1]="VERBOSE",t[t.INFO=2]="INFO",t[t.WARN=3]="WARN",t[t.ERROR=4]="ERROR",t[t.SILENT=5]="SILENT"})(ie||(ie={}));const t1={debug:ie.DEBUG,verbose:ie.VERBOSE,info:ie.INFO,warn:ie.WARN,error:ie.ERROR,silent:ie.SILENT},n1=ie.INFO,r1={[ie.DEBUG]:"log",[ie.VERBOSE]:"log",[ie.INFO]:"info",[ie.WARN]:"warn",[ie.ERROR]:"error"},i1=(t,e,...n)=>{if(e<t.logLevel)return;const r=new Date().toISOString(),i=r1[e];if(i)console[i](`[${r}]  ${t.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Qc{constructor(e){this.name=e,this._logLevel=n1,this._logHandler=i1,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in ie))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?t1[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,ie.DEBUG,...e),this._logHandler(this,ie.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,ie.VERBOSE,...e),this._logHandler(this,ie.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,ie.INFO,...e),this._logHandler(this,ie.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,ie.WARN,...e),this._logHandler(this,ie.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,ie.ERROR,...e),this._logHandler(this,ie.ERROR,...e)}}const s1=(t,e)=>e.some(n=>t instanceof n);let ov,av;function o1(){return ov||(ov=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function a1(){return av||(av=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Z0=new WeakMap,Of=new WeakMap,eI=new WeakMap,gd=new WeakMap,Tm=new WeakMap;function l1(t){const e=new Promise((n,r)=>{const i=()=>{t.removeEventListener("success",s),t.removeEventListener("error",o)},s=()=>{n(Or(t.result)),i()},o=()=>{r(t.error),i()};t.addEventListener("success",s),t.addEventListener("error",o)});return e.then(n=>{n instanceof IDBCursor&&Z0.set(n,t)}).catch(()=>{}),Tm.set(e,t),e}function u1(t){if(Of.has(t))return;const e=new Promise((n,r)=>{const i=()=>{t.removeEventListener("complete",s),t.removeEventListener("error",o),t.removeEventListener("abort",o)},s=()=>{n(),i()},o=()=>{r(t.error||new DOMException("AbortError","AbortError")),i()};t.addEventListener("complete",s),t.addEventListener("error",o),t.addEventListener("abort",o)});Of.set(t,e)}let Lf={get(t,e,n){if(t instanceof IDBTransaction){if(e==="done")return Of.get(t);if(e==="objectStoreNames")return t.objectStoreNames||eI.get(t);if(e==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return Or(t[e])},set(t,e,n){return t[e]=n,!0},has(t,e){return t instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in t}};function c1(t){Lf=t(Lf)}function h1(t){return t===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...n){const r=t.call(_d(this),e,...n);return eI.set(r,e.sort?e.sort():[e]),Or(r)}:a1().includes(t)?function(...e){return t.apply(_d(this),e),Or(Z0.get(this))}:function(...e){return Or(t.apply(_d(this),e))}}function d1(t){return typeof t=="function"?h1(t):(t instanceof IDBTransaction&&u1(t),s1(t,o1())?new Proxy(t,Lf):t)}function Or(t){if(t instanceof IDBRequest)return l1(t);if(gd.has(t))return gd.get(t);const e=d1(t);return e!==t&&(gd.set(t,e),Tm.set(e,t)),e}const _d=t=>Tm.get(t);function f1(t,e,{blocked:n,upgrade:r,blocking:i,terminated:s}={}){const o=indexedDB.open(t,e),l=Or(o);return r&&o.addEventListener("upgradeneeded",u=>{r(Or(o.result),u.oldVersion,u.newVersion,Or(o.transaction),u)}),n&&o.addEventListener("blocked",u=>n(u.oldVersion,u.newVersion,u)),l.then(u=>{s&&u.addEventListener("close",()=>s()),i&&u.addEventListener("versionchange",c=>i(c.oldVersion,c.newVersion,c))}).catch(()=>{}),l}const p1=["get","getKey","getAll","getAllKeys","count"],m1=["put","add","delete","clear"],yd=new Map;function lv(t,e){if(!(t instanceof IDBDatabase&&!(e in t)&&typeof e=="string"))return;if(yd.get(e))return yd.get(e);const n=e.replace(/FromIndex$/,""),r=e!==n,i=m1.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(i||p1.includes(n)))return;const s=async function(o,...l){const u=this.transaction(o,i?"readwrite":"readonly");let c=u.store;return r&&(c=c.index(l.shift())),(await Promise.all([c[n](...l),i&&u.done]))[0]};return yd.set(e,s),s}c1(t=>({...t,get:(e,n,r)=>lv(e,n)||t.get(e,n,r),has:(e,n)=>!!lv(e,n)||t.has(e,n)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class g1{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(_1(n)){const r=n.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(n=>n).join(" ")}}function _1(t){const e=t.getComponent();return(e==null?void 0:e.type)==="VERSION"}const Vf="@firebase/app",uv="0.10.13";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rr=new Qc("@firebase/app"),y1="@firebase/app-compat",v1="@firebase/analytics-compat",w1="@firebase/analytics",E1="@firebase/app-check-compat",T1="@firebase/app-check",I1="@firebase/auth",S1="@firebase/auth-compat",C1="@firebase/database",k1="@firebase/data-connect",R1="@firebase/database-compat",A1="@firebase/functions",N1="@firebase/functions-compat",P1="@firebase/installations",x1="@firebase/installations-compat",b1="@firebase/messaging",D1="@firebase/messaging-compat",M1="@firebase/performance",O1="@firebase/performance-compat",L1="@firebase/remote-config",V1="@firebase/remote-config-compat",F1="@firebase/storage",j1="@firebase/storage-compat",U1="@firebase/firestore",$1="@firebase/vertexai-preview",B1="@firebase/firestore-compat",z1="firebase",W1="10.14.1";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ff="[DEFAULT]",H1={[Vf]:"fire-core",[y1]:"fire-core-compat",[w1]:"fire-analytics",[v1]:"fire-analytics-compat",[T1]:"fire-app-check",[E1]:"fire-app-check-compat",[I1]:"fire-auth",[S1]:"fire-auth-compat",[C1]:"fire-rtdb",[k1]:"fire-data-connect",[R1]:"fire-rtdb-compat",[A1]:"fire-fn",[N1]:"fire-fn-compat",[P1]:"fire-iid",[x1]:"fire-iid-compat",[b1]:"fire-fcm",[D1]:"fire-fcm-compat",[M1]:"fire-perf",[O1]:"fire-perf-compat",[L1]:"fire-rc",[V1]:"fire-rc-compat",[F1]:"fire-gcs",[j1]:"fire-gcs-compat",[U1]:"fire-fst",[B1]:"fire-fst-compat",[$1]:"fire-vertex","fire-js":"fire-js",[z1]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ju=new Map,q1=new Map,jf=new Map;function cv(t,e){try{t.container.addComponent(e)}catch(n){rr.debug(`Component ${e.name} failed to register with FirebaseApp ${t.name}`,n)}}function Ci(t){const e=t.name;if(jf.has(e))return rr.debug(`There were multiple attempts to register component ${e}.`),!1;jf.set(e,t);for(const n of Ju.values())cv(n,t);for(const n of q1.values())cv(n,t);return!0}function Yc(t,e){const n=t.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),t.container.getProvider(e)}function wn(t){return t.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const G1={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Lr=new Ya("app","Firebase",G1);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class K1{constructor(e,n,r){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},n),this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new zr("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Lr.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Oi=W1;function tI(t,e={}){let n=t;typeof e!="object"&&(e={name:e});const r=Object.assign({name:Ff,automaticDataCollectionEnabled:!1},e),i=r.name;if(typeof i!="string"||!i)throw Lr.create("bad-app-name",{appName:String(i)});if(n||(n=K0()),!n)throw Lr.create("no-options");const s=Ju.get(i);if(s){if(Xu(n,s.options)&&Xu(r,s.config))return s;throw Lr.create("duplicate-app",{appName:i})}const o=new e1(i);for(const u of jf.values())o.addComponent(u);const l=new K1(n,r,o);return Ju.set(i,l),l}function Im(t=Ff){const e=Ju.get(t);if(!e&&t===Ff&&K0())return tI();if(!e)throw Lr.create("no-app",{appName:t});return e}function Sn(t,e,n){var r;let i=(r=H1[t])!==null&&r!==void 0?r:t;n&&(i+=`-${n}`);const s=i.match(/\s|\//),o=e.match(/\s|\//);if(s||o){const l=[`Unable to register library "${i}" with version "${e}":`];s&&l.push(`library name "${i}" contains illegal characters (whitespace or "/")`),s&&o&&l.push("and"),o&&l.push(`version name "${e}" contains illegal characters (whitespace or "/")`),rr.warn(l.join(" "));return}Ci(new zr(`${i}-version`,()=>({library:i,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Q1="firebase-heartbeat-database",Y1=1,Ca="firebase-heartbeat-store";let vd=null;function nI(){return vd||(vd=f1(Q1,Y1,{upgrade:(t,e)=>{switch(e){case 0:try{t.createObjectStore(Ca)}catch(n){console.warn(n)}}}}).catch(t=>{throw Lr.create("idb-open",{originalErrorMessage:t.message})})),vd}async function X1(t){try{const n=(await nI()).transaction(Ca),r=await n.objectStore(Ca).get(rI(t));return await n.done,r}catch(e){if(e instanceof ur)rr.warn(e.message);else{const n=Lr.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});rr.warn(n.message)}}}async function hv(t,e){try{const r=(await nI()).transaction(Ca,"readwrite");await r.objectStore(Ca).put(e,rI(t)),await r.done}catch(n){if(n instanceof ur)rr.warn(n.message);else{const r=Lr.create("idb-set",{originalErrorMessage:n==null?void 0:n.message});rr.warn(r.message)}}}function rI(t){return`${t.name}!${t.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const J1=1024,Z1=30*24*60*60*1e3;class ex{constructor(e){this.container=e,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new nx(n),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,n;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=dv();return((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((n=this._heartbeatsCache)===null||n===void 0?void 0:n.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(o=>o.date===s)?void 0:(this._heartbeatsCache.heartbeats.push({date:s,agent:i}),this._heartbeatsCache.heartbeats=this._heartbeatsCache.heartbeats.filter(o=>{const l=new Date(o.date).valueOf();return Date.now()-l<=Z1}),this._storage.overwrite(this._heartbeatsCache))}catch(r){rr.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const n=dv(),{heartbeatsToSend:r,unsentEntries:i}=tx(this._heartbeatsCache.heartbeats),s=Ku(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=n,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(n){return rr.warn(n),""}}}function dv(){return new Date().toISOString().substring(0,10)}function tx(t,e=J1){const n=[];let r=t.slice();for(const i of t){const s=n.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),fv(n)>e){s.dates.pop();break}}else if(n.push({agent:i.agent,dates:[i.date]}),fv(n)>e){n.pop();break}r=r.slice(1)}return{heartbeatsToSend:n,unsentEntries:r}}class nx{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return jP()?UP().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await X1(this.app);return n!=null&&n.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var n;if(await this._canUseIndexedDBPromise){const i=await this.read();return hv(this.app,{lastSentHeartbeatDate:(n=e.lastSentHeartbeatDate)!==null&&n!==void 0?n:i.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var n;if(await this._canUseIndexedDBPromise){const i=await this.read();return hv(this.app,{lastSentHeartbeatDate:(n=e.lastSentHeartbeatDate)!==null&&n!==void 0?n:i.lastSentHeartbeatDate,heartbeats:[...i.heartbeats,...e.heartbeats]})}else return}}function fv(t){return Ku(JSON.stringify({version:2,heartbeats:t})).length}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function rx(t){Ci(new zr("platform-logger",e=>new g1(e),"PRIVATE")),Ci(new zr("heartbeat",e=>new ex(e),"PRIVATE")),Sn(Vf,uv,t),Sn(Vf,uv,"esm2017"),Sn("fire-js","")}rx("");var ix="firebase",sx="10.14.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Sn(ix,sx,"app");function Sm(t,e){var n={};for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&e.indexOf(r)<0&&(n[r]=t[r]);if(t!=null&&typeof Object.getOwnPropertySymbols=="function")for(var i=0,r=Object.getOwnPropertySymbols(t);i<r.length;i++)e.indexOf(r[i])<0&&Object.prototype.propertyIsEnumerable.call(t,r[i])&&(n[r[i]]=t[r[i]]);return n}function iI(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const ox=iI,sI=new Ya("auth","Firebase",iI());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zu=new Qc("@firebase/auth");function ax(t,...e){Zu.logLevel<=ie.WARN&&Zu.warn(`Auth (${Oi}): ${t}`,...e)}function pu(t,...e){Zu.logLevel<=ie.ERROR&&Zu.error(`Auth (${Oi}): ${t}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function An(t,...e){throw km(t,...e)}function dn(t,...e){return km(t,...e)}function Cm(t,e,n){const r=Object.assign(Object.assign({},ox()),{[e]:n});return new Ya("auth","Firebase",r).create(e,{appName:t.name})}function Vr(t){return Cm(t,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function oI(t,e,n){const r=n;if(!(e instanceof r))throw r.name!==e.constructor.name&&An(t,"argument-error"),Cm(t,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function km(t,...e){if(typeof t!="string"){const n=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=t.name),t._errorFactory.create(n,...r)}return sI.create(t,...e)}function Q(t,e,...n){if(!t)throw km(e,...n)}function Hn(t){const e="INTERNAL ASSERTION FAILED: "+t;throw pu(e),new Error(e)}function ir(t,e){t||Hn(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Uf(){var t;return typeof self<"u"&&((t=self.location)===null||t===void 0?void 0:t.href)||""}function lx(){return pv()==="http:"||pv()==="https:"}function pv(){var t;return typeof self<"u"&&((t=self.location)===null||t===void 0?void 0:t.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ux(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(lx()||OP()||"connection"in navigator)?navigator.onLine:!0}function cx(){if(typeof navigator>"u")return null;const t=navigator;return t.languages&&t.languages[0]||t.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xa{constructor(e,n){this.shortDelay=e,this.longDelay=n,ir(n>e,"Short delay should be less than long delay!"),this.isMobile=wm()||X0()}get(){return ux()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rm(t,e){ir(t.emulator,"Emulator should always be set here");const{url:n}=t.emulator;return e?`${n}${e.startsWith("/")?e.slice(1):e}`:n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class aI{static initialize(e,n,r){this.fetchImpl=e,n&&(this.headersImpl=n),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;Hn("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;Hn("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;Hn("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hx={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dx=new Xa(3e4,6e4);function Am(t,e){return t.tenantId&&!e.tenantId?Object.assign(Object.assign({},e),{tenantId:t.tenantId}):e}async function Ks(t,e,n,r,i={}){return lI(t,i,async()=>{let s={},o={};r&&(e==="GET"?o=r:s={body:JSON.stringify(r)});const l=Gs(Object.assign({key:t.config.apiKey},o)).slice(1),u=await t._getAdditionalHeaders();u["Content-Type"]="application/json",t.languageCode&&(u["X-Firebase-Locale"]=t.languageCode);const c=Object.assign({method:e,headers:u},s);return MP()||(c.referrerPolicy="no-referrer"),aI.fetch()(uI(t,t.config.apiHost,n,l),c)})}async function lI(t,e,n){t._canInitEmulator=!1;const r=Object.assign(Object.assign({},hx),e);try{const i=new px(t),s=await Promise.race([n(),i.promise]);i.clearNetworkTimeout();const o=await s.json();if("needConfirmation"in o)throw Kl(t,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{const l=s.ok?o.errorMessage:o.error.message,[u,c]=l.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw Kl(t,"credential-already-in-use",o);if(u==="EMAIL_EXISTS")throw Kl(t,"email-already-in-use",o);if(u==="USER_DISABLED")throw Kl(t,"user-disabled",o);const d=r[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(c)throw Cm(t,d,c);An(t,d)}}catch(i){if(i instanceof ur)throw i;An(t,"network-request-failed",{message:String(i)})}}async function fx(t,e,n,r,i={}){const s=await Ks(t,e,n,r,i);return"mfaPendingCredential"in s&&An(t,"multi-factor-auth-required",{_serverResponse:s}),s}function uI(t,e,n,r){const i=`${e}${n}?${r}`;return t.config.emulator?Rm(t.config,i):`${t.config.apiScheme}://${i}`}class px{constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((n,r)=>{this.timer=setTimeout(()=>r(dn(this.auth,"network-request-failed")),dx.get())})}clearNetworkTimeout(){clearTimeout(this.timer)}}function Kl(t,e,n){const r={appName:t.name};n.email&&(r.email=n.email),n.phoneNumber&&(r.phoneNumber=n.phoneNumber);const i=dn(t,e,r);return i.customData._tokenResponse=n,i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function mx(t,e){return Ks(t,"POST","/v1/accounts:delete",e)}async function cI(t,e){return Ks(t,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Go(t){if(t)try{const e=new Date(Number(t));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function gx(t,e=!1){const n=Je(t),r=await n.getIdToken(e),i=Nm(r);Q(i&&i.exp&&i.auth_time&&i.iat,n.auth,"internal-error");const s=typeof i.firebase=="object"?i.firebase:void 0,o=s==null?void 0:s.sign_in_provider;return{claims:i,token:r,authTime:Go(wd(i.auth_time)),issuedAtTime:Go(wd(i.iat)),expirationTime:Go(wd(i.exp)),signInProvider:o||null,signInSecondFactor:(s==null?void 0:s.sign_in_second_factor)||null}}function wd(t){return Number(t)*1e3}function Nm(t){const[e,n,r]=t.split(".");if(e===void 0||n===void 0||r===void 0)return pu("JWT malformed, contained fewer than 3 sections"),null;try{const i=Qu(n);return i?JSON.parse(i):(pu("Failed to decode base64 JWT payload"),null)}catch(i){return pu("Caught error parsing JWT payload as JSON",i==null?void 0:i.toString()),null}}function mv(t){const e=Nm(t);return Q(e,"internal-error"),Q(typeof e.exp<"u","internal-error"),Q(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ka(t,e,n=!1){if(n)return e;try{return await e}catch(r){throw r instanceof ur&&_x(r)&&t.auth.currentUser===t&&await t.auth.signOut(),r}}function _x({code:t}){return t==="auth/user-disabled"||t==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yx{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){var n;if(e){const r=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),r}else{this.errorBackoff=3e4;const i=((n=this.user.stsTokenManager.expirationTime)!==null&&n!==void 0?n:0)-Date.now()-3e5;return Math.max(0,i)}}schedule(e=!1){if(!this.isRunning)return;const n=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},n)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $f{constructor(e,n){this.createdAt=e,this.lastLoginAt=n,this._initializeTime()}_initializeTime(){this.lastSignInTime=Go(this.lastLoginAt),this.creationTime=Go(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ec(t){var e;const n=t.auth,r=await t.getIdToken(),i=await ka(t,cI(n,{idToken:r}));Q(i==null?void 0:i.users.length,n,"internal-error");const s=i.users[0];t._notifyReloadListener(s);const o=!((e=s.providerUserInfo)===null||e===void 0)&&e.length?hI(s.providerUserInfo):[],l=wx(t.providerData,o),u=t.isAnonymous,c=!(t.email&&s.passwordHash)&&!(l!=null&&l.length),d=u?c:!1,p={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:l,metadata:new $f(s.createdAt,s.lastLoginAt),isAnonymous:d};Object.assign(t,p)}async function vx(t){const e=Je(t);await ec(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function wx(t,e){return[...t.filter(r=>!e.some(i=>i.providerId===r.providerId)),...e]}function hI(t){return t.map(e=>{var{providerId:n}=e,r=Sm(e,["providerId"]);return{providerId:n,uid:r.rawId||"",displayName:r.displayName||null,email:r.email||null,phoneNumber:r.phoneNumber||null,photoURL:r.photoUrl||null}})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ex(t,e){const n=await lI(t,{},async()=>{const r=Gs({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=t.config,o=uI(t,i,"/v1/token",`key=${s}`),l=await t._getAdditionalHeaders();return l["Content-Type"]="application/x-www-form-urlencoded",aI.fetch()(o,{method:"POST",headers:l,body:r})});return{accessToken:n.access_token,expiresIn:n.expires_in,refreshToken:n.refresh_token}}async function Tx(t,e){return Ks(t,"POST","/v2/accounts:revokeToken",Am(t,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ps{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){Q(e.idToken,"internal-error"),Q(typeof e.idToken<"u","internal-error"),Q(typeof e.refreshToken<"u","internal-error");const n="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):mv(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,n)}updateFromIdToken(e){Q(e.length!==0,"internal-error");const n=mv(e);this.updateTokensAndExpiration(e,null,n)}async getToken(e,n=!1){return!n&&this.accessToken&&!this.isExpired?this.accessToken:(Q(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,n){const{accessToken:r,refreshToken:i,expiresIn:s}=await Ex(e,n);this.updateTokensAndExpiration(r,i,Number(s))}updateTokensAndExpiration(e,n,r){this.refreshToken=n||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,n){const{refreshToken:r,accessToken:i,expirationTime:s}=n,o=new ps;return r&&(Q(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),i&&(Q(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&(Q(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new ps,this.toJSON())}_performRefresh(){return Hn("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gr(t,e){Q(typeof t=="string"||typeof t>"u","internal-error",{appName:e})}class qn{constructor(e){var{uid:n,auth:r,stsTokenManager:i}=e,s=Sm(e,["uid","auth","stsTokenManager"]);this.providerId="firebase",this.proactiveRefresh=new yx(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=n,this.auth=r,this.stsTokenManager=i,this.accessToken=i.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new $f(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const n=await ka(this,this.stsTokenManager.getToken(this.auth,e));return Q(n,this.auth,"internal-error"),this.accessToken!==n&&(this.accessToken=n,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),n}getIdTokenResult(e){return gx(this,e)}reload(){return vx(this)}_assign(e){this!==e&&(Q(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(n=>Object.assign({},n)),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const n=new qn(Object.assign(Object.assign({},this),{auth:e,stsTokenManager:this.stsTokenManager._clone()}));return n.metadata._copy(this.metadata),n}_onReload(e){Q(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,n=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),n&&await ec(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(wn(this.auth.app))return Promise.reject(Vr(this.auth));const e=await this.getIdToken();return await ka(this,mx(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return Object.assign(Object.assign({uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>Object.assign({},e)),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId},this.metadata.toJSON()),{apiKey:this.auth.config.apiKey,appName:this.auth.name})}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,n){var r,i,s,o,l,u,c,d;const p=(r=n.displayName)!==null&&r!==void 0?r:void 0,m=(i=n.email)!==null&&i!==void 0?i:void 0,E=(s=n.phoneNumber)!==null&&s!==void 0?s:void 0,k=(o=n.photoURL)!==null&&o!==void 0?o:void 0,x=(l=n.tenantId)!==null&&l!==void 0?l:void 0,P=(u=n._redirectEventId)!==null&&u!==void 0?u:void 0,S=(c=n.createdAt)!==null&&c!==void 0?c:void 0,w=(d=n.lastLoginAt)!==null&&d!==void 0?d:void 0,{uid:R,emailVerified:D,isAnonymous:j,providerData:O,stsTokenManager:T}=n;Q(R&&T,e,"internal-error");const y=ps.fromJSON(this.name,T);Q(typeof R=="string",e,"internal-error"),gr(p,e.name),gr(m,e.name),Q(typeof D=="boolean",e,"internal-error"),Q(typeof j=="boolean",e,"internal-error"),gr(E,e.name),gr(k,e.name),gr(x,e.name),gr(P,e.name),gr(S,e.name),gr(w,e.name);const v=new qn({uid:R,auth:e,email:m,emailVerified:D,displayName:p,isAnonymous:j,photoURL:k,phoneNumber:E,tenantId:x,stsTokenManager:y,createdAt:S,lastLoginAt:w});return O&&Array.isArray(O)&&(v.providerData=O.map(I=>Object.assign({},I))),P&&(v._redirectEventId=P),v}static async _fromIdTokenResponse(e,n,r=!1){const i=new ps;i.updateFromServerResponse(n);const s=new qn({uid:n.localId,auth:e,stsTokenManager:i,isAnonymous:r});return await ec(s),s}static async _fromGetAccountInfoResponse(e,n,r){const i=n.users[0];Q(i.localId!==void 0,"internal-error");const s=i.providerUserInfo!==void 0?hI(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!(s!=null&&s.length),l=new ps;l.updateFromIdToken(r);const u=new qn({uid:i.localId,auth:e,stsTokenManager:l,isAnonymous:o}),c={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new $f(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!(s!=null&&s.length)};return Object.assign(u,c),u}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gv=new Map;function Gn(t){ir(t instanceof Function,"Expected a class definition");let e=gv.get(t);return e?(ir(e instanceof t,"Instance stored in cache mismatched with class"),e):(e=new t,gv.set(t,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dI{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,n){this.storage[e]=n}async _get(e){const n=this.storage[e];return n===void 0?null:n}async _remove(e){delete this.storage[e]}_addListener(e,n){}_removeListener(e,n){}}dI.type="NONE";const _v=dI;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mu(t,e,n){return`firebase:${t}:${e}:${n}`}class ms{constructor(e,n,r){this.persistence=e,this.auth=n,this.userKey=r;const{config:i,name:s}=this.auth;this.fullUserKey=mu(this.userKey,i.apiKey,s),this.fullPersistenceKey=mu("persistence",i.apiKey,s),this.boundEventHandler=n._onStorageEvent.bind(n),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);return e?qn._fromJSON(this.auth,e):null}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const n=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,n)return this.setCurrentUser(n)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,n,r="authUser"){if(!n.length)return new ms(Gn(_v),e,r);const i=(await Promise.all(n.map(async c=>{if(await c._isAvailable())return c}))).filter(c=>c);let s=i[0]||Gn(_v);const o=mu(r,e.config.apiKey,e.name);let l=null;for(const c of n)try{const d=await c._get(o);if(d){const p=qn._fromJSON(e,d);c!==s&&(l=p),s=c;break}}catch{}const u=i.filter(c=>c._shouldAllowMigration);return!s._shouldAllowMigration||!u.length?new ms(s,e,r):(s=u[0],l&&await s._set(o,l.toJSON()),await Promise.all(n.map(async c=>{if(c!==s)try{await c._remove(o)}catch{}})),new ms(s,e,r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yv(t){const e=t.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(gI(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(fI(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(yI(e))return"Blackberry";if(vI(e))return"Webos";if(pI(e))return"Safari";if((e.includes("chrome/")||mI(e))&&!e.includes("edge/"))return"Chrome";if(_I(e))return"Android";{const n=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=t.match(n);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function fI(t=wt()){return/firefox\//i.test(t)}function pI(t=wt()){const e=t.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function mI(t=wt()){return/crios\//i.test(t)}function gI(t=wt()){return/iemobile/i.test(t)}function _I(t=wt()){return/android/i.test(t)}function yI(t=wt()){return/blackberry/i.test(t)}function vI(t=wt()){return/webos/i.test(t)}function Pm(t=wt()){return/iphone|ipad|ipod/i.test(t)||/macintosh/i.test(t)&&/mobile/i.test(t)}function Ix(t=wt()){var e;return Pm(t)&&!!(!((e=window.navigator)===null||e===void 0)&&e.standalone)}function Sx(){return LP()&&document.documentMode===10}function wI(t=wt()){return Pm(t)||_I(t)||vI(t)||yI(t)||/windows phone/i.test(t)||gI(t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function EI(t,e=[]){let n;switch(t){case"Browser":n=yv(wt());break;case"Worker":n=`${yv(wt())}-${t}`;break;default:n=t}const r=e.length?e.join(","):"FirebaseCore-web";return`${n}/JsCore/${Oi}/${r}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cx{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,n){const r=s=>new Promise((o,l)=>{try{const u=e(s);o(u)}catch(u){l(u)}});r.onAbort=n,this.queue.push(r);const i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const n=[];try{for(const r of this.queue)await r(e),r.onAbort&&n.push(r.onAbort)}catch(r){n.reverse();for(const i of n)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function kx(t,e={}){return Ks(t,"GET","/v2/passwordPolicy",Am(t,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rx=6;class Ax{constructor(e){var n,r,i,s;const o=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=(n=o.minPasswordLength)!==null&&n!==void 0?n:Rx,o.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=o.maxPasswordLength),o.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=o.containsLowercaseCharacter),o.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=o.containsUppercaseCharacter),o.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=o.containsNumericCharacter),o.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=o.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=(i=(r=e.allowedNonAlphanumericCharacters)===null||r===void 0?void 0:r.join(""))!==null&&i!==void 0?i:"",this.forceUpgradeOnSignin=(s=e.forceUpgradeOnSignin)!==null&&s!==void 0?s:!1,this.schemaVersion=e.schemaVersion}validatePassword(e){var n,r,i,s,o,l;const u={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,u),this.validatePasswordCharacterOptions(e,u),u.isValid&&(u.isValid=(n=u.meetsMinPasswordLength)!==null&&n!==void 0?n:!0),u.isValid&&(u.isValid=(r=u.meetsMaxPasswordLength)!==null&&r!==void 0?r:!0),u.isValid&&(u.isValid=(i=u.containsLowercaseLetter)!==null&&i!==void 0?i:!0),u.isValid&&(u.isValid=(s=u.containsUppercaseLetter)!==null&&s!==void 0?s:!0),u.isValid&&(u.isValid=(o=u.containsNumericCharacter)!==null&&o!==void 0?o:!0),u.isValid&&(u.isValid=(l=u.containsNonAlphanumericCharacter)!==null&&l!==void 0?l:!0),u}validatePasswordLengthOptions(e,n){const r=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;r&&(n.meetsMinPasswordLength=e.length>=r),i&&(n.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,n){this.updatePasswordCharacterOptionsStatuses(n,!1,!1,!1,!1);let r;for(let i=0;i<e.length;i++)r=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(n,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,n,r,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=n)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nx{constructor(e,n,r,i){this.app=e,this.heartbeatServiceProvider=n,this.appCheckServiceProvider=r,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new vv(this),this.idTokenSubscription=new vv(this),this.beforeStateQueue=new Cx(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=sI,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion}_initializeWithPersistence(e,n){return n&&(this._popupRedirectResolver=Gn(n)),this._initializationPromise=this.queue(async()=>{var r,i;if(!this._deleted&&(this.persistenceManager=await ms.create(this,e),!this._deleted)){if(!((r=this._popupRedirectResolver)===null||r===void 0)&&r._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(n),this.lastNotifiedUid=((i=this.currentUser)===null||i===void 0?void 0:i.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const n=await cI(this,{idToken:e}),r=await qn._fromGetAccountInfoResponse(this,n,e);await this.directlySetCurrentUser(r)}catch(n){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",n),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var n;if(wn(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(l=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(l,l))}):this.directlySetCurrentUser(null)}const r=await this.assertedPersistence.getCurrentUser();let i=r,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(n=this.redirectUser)===null||n===void 0?void 0:n._redirectEventId,l=i==null?void 0:i._redirectEventId,u=await this.tryRedirectSignIn(e);(!o||o===l)&&(u!=null&&u.user)&&(i=u.user,s=!0)}if(!i)return this.directlySetCurrentUser(null);if(!i._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(i)}catch(o){i=r,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return i?this.reloadAndSetCurrentUserOrClear(i):this.directlySetCurrentUser(null)}return Q(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===i._redirectEventId?this.directlySetCurrentUser(i):this.reloadAndSetCurrentUserOrClear(i)}async tryRedirectSignIn(e){let n=null;try{n=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return n}async reloadAndSetCurrentUserOrClear(e){try{await ec(e)}catch(n){if((n==null?void 0:n.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=cx()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(wn(this.app))return Promise.reject(Vr(this));const n=e?Je(e):null;return n&&Q(n.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(n&&n._clone(this))}async _updateCurrentUser(e,n=!1){if(!this._deleted)return e&&Q(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),n||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return wn(this.app)?Promise.reject(Vr(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return wn(this.app)?Promise.reject(Vr(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(Gn(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const n=this._getPasswordPolicyInternal();return n.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):n.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await kx(this),n=new Ax(e);this.tenantId===null?this._projectPasswordPolicy=n:this._tenantPasswordPolicies[this.tenantId]=n}_getPersistence(){return this.assertedPersistence.persistence.type}_updateErrorMap(e){this._errorFactory=new Ya("auth","Firebase",e())}onAuthStateChanged(e,n,r){return this.registerStateListener(this.authStateSubscription,e,n,r)}beforeAuthStateChanged(e,n){return this.beforeStateQueue.pushCallback(e,n)}onIdTokenChanged(e,n,r){return this.registerStateListener(this.idTokenSubscription,e,n,r)}authStateReady(){return new Promise((e,n)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},n)}})}async revokeAccessToken(e){if(this.currentUser){const n=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:n};this.tenantId!=null&&(r.tenantId=this.tenantId),await Tx(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)===null||e===void 0?void 0:e.toJSON()}}async _setRedirectUser(e,n){const r=await this.getOrInitRedirectPersistenceManager(n);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const n=e&&Gn(e)||this._popupRedirectResolver;Q(n,this,"argument-error"),this.redirectPersistenceManager=await ms.create(this,[Gn(n._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var n,r;return this._isInitialized&&await this.queue(async()=>{}),((n=this._currentUser)===null||n===void 0?void 0:n._redirectEventId)===e?this._currentUser:((r=this.redirectUser)===null||r===void 0?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var e,n;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const r=(n=(e=this.currentUser)===null||e===void 0?void 0:e.uid)!==null&&n!==void 0?n:null;this.lastNotifiedUid!==r&&(this.lastNotifiedUid=r,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,n,r,i){if(this._deleted)return()=>{};const s=typeof n=="function"?n:n.next.bind(n);let o=!1;const l=this._isInitialized?Promise.resolve():this._initializationPromise;if(Q(l,this,"internal-error"),l.then(()=>{o||s(this.currentUser)}),typeof n=="function"){const u=e.addObserver(n,r,i);return()=>{o=!0,u()}}else{const u=e.addObserver(n);return()=>{o=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return Q(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=EI(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var e;const n={"X-Client-Version":this.clientVersion};this.app.options.appId&&(n["X-Firebase-gmpid"]=this.app.options.appId);const r=await((e=this.heartbeatServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getHeartbeatsHeader());r&&(n["X-Firebase-Client"]=r);const i=await this._getAppCheckToken();return i&&(n["X-Firebase-AppCheck"]=i),n}async _getAppCheckToken(){var e;const n=await((e=this.appCheckServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getToken());return n!=null&&n.error&&ax(`Error while retrieving App Check token: ${n.error}`),n==null?void 0:n.token}}function Ja(t){return Je(t)}class vv{constructor(e){this.auth=e,this.observer=null,this.addObserver=GP(n=>this.observer=n)}get next(){return Q(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let xm={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function Px(t){xm=t}function xx(t){return xm.loadJS(t)}function bx(){return xm.gapiScript}function Dx(t){return`__${t}${Math.floor(Math.random()*1e6)}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Mx(t,e){const n=Yc(t,"auth");if(n.isInitialized()){const i=n.getImmediate(),s=n.getOptions();if(Xu(s,e??{}))return i;An(i,"already-initialized")}return n.initialize({options:e})}function Ox(t,e){const n=(e==null?void 0:e.persistence)||[],r=(Array.isArray(n)?n:[n]).map(Gn);e!=null&&e.errorMap&&t._updateErrorMap(e.errorMap),t._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function Lx(t,e,n){const r=Ja(t);Q(r._canInitEmulator,r,"emulator-config-failed"),Q(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const i=!1,s=TI(e),{host:o,port:l}=Vx(e),u=l===null?"":`:${l}`;r.config.emulator={url:`${s}//${o}${u}/`},r.settings.appVerificationDisabledForTesting=!0,r.emulatorConfig=Object.freeze({host:o,port:l,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})}),Fx()}function TI(t){const e=t.indexOf(":");return e<0?"":t.substr(0,e+1)}function Vx(t){const e=TI(t),n=/(\/\/)?([^?#/]+)/.exec(t.substr(e.length));if(!n)return{host:"",port:null};const r=n[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(r);if(i){const s=i[1];return{host:s,port:wv(r.substr(s.length+1))}}else{const[s,o]=r.split(":");return{host:s,port:wv(o)}}}function wv(t){if(!t)return null;const e=Number(t);return isNaN(e)?null:e}function Fx(){function t(){const e=document.createElement("p"),n=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",n.position="fixed",n.width="100%",n.backgroundColor="#ffffff",n.border=".1em solid #000000",n.color="#b50000",n.bottom="0px",n.left="0px",n.margin="0px",n.zIndex="10000",n.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",t):t())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class II{constructor(e,n){this.providerId=e,this.signInMethod=n}toJSON(){return Hn("not implemented")}_getIdTokenResponse(e){return Hn("not implemented")}_linkToIdToken(e,n){return Hn("not implemented")}_getReauthenticationResolver(e){return Hn("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function gs(t,e){return fx(t,"POST","/v1/accounts:signInWithIdp",Am(t,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jx="http://localhost";class ki extends II{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const n=new ki(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(n.idToken=e.idToken),e.accessToken&&(n.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(n.nonce=e.nonce),e.pendingToken&&(n.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(n.accessToken=e.oauthToken,n.secret=e.oauthTokenSecret):An("argument-error"),n}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const n=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:i}=n,s=Sm(n,["providerId","signInMethod"]);if(!r||!i)return null;const o=new ki(r,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){const n=this.buildRequest();return gs(e,n)}_linkToIdToken(e,n){const r=this.buildRequest();return r.idToken=n,gs(e,r)}_getReauthenticationResolver(e){const n=this.buildRequest();return n.autoCreate=!1,gs(e,n)}buildRequest(){const e={requestUri:jx,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const n={};this.idToken&&(n.id_token=this.idToken),this.accessToken&&(n.access_token=this.accessToken),this.secret&&(n.oauth_token_secret=this.secret),n.providerId=this.providerId,this.nonce&&!this.pendingToken&&(n.nonce=this.nonce),e.postBody=Gs(n)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xc{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Za extends Xc{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Er extends Za{constructor(){super("facebook.com")}static credential(e){return ki._fromParams({providerId:Er.PROVIDER_ID,signInMethod:Er.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Er.credentialFromTaggedObject(e)}static credentialFromError(e){return Er.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Er.credential(e.oauthAccessToken)}catch{return null}}}Er.FACEBOOK_SIGN_IN_METHOD="facebook.com";Er.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bn extends Za{constructor(){super("google.com"),this.addScope("profile")}static credential(e,n){return ki._fromParams({providerId:Bn.PROVIDER_ID,signInMethod:Bn.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:n})}static credentialFromResult(e){return Bn.credentialFromTaggedObject(e)}static credentialFromError(e){return Bn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:n,oauthAccessToken:r}=e;if(!n&&!r)return null;try{return Bn.credential(n,r)}catch{return null}}}Bn.GOOGLE_SIGN_IN_METHOD="google.com";Bn.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tr extends Za{constructor(){super("github.com")}static credential(e){return ki._fromParams({providerId:Tr.PROVIDER_ID,signInMethod:Tr.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Tr.credentialFromTaggedObject(e)}static credentialFromError(e){return Tr.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Tr.credential(e.oauthAccessToken)}catch{return null}}}Tr.GITHUB_SIGN_IN_METHOD="github.com";Tr.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ir extends Za{constructor(){super("twitter.com")}static credential(e,n){return ki._fromParams({providerId:Ir.PROVIDER_ID,signInMethod:Ir.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:n})}static credentialFromResult(e){return Ir.credentialFromTaggedObject(e)}static credentialFromError(e){return Ir.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:n,oauthTokenSecret:r}=e;if(!n||!r)return null;try{return Ir.credential(n,r)}catch{return null}}}Ir.TWITTER_SIGN_IN_METHOD="twitter.com";Ir.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ps{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,n,r,i=!1){const s=await qn._fromIdTokenResponse(e,r,i),o=Ev(r);return new Ps({user:s,providerId:o,_tokenResponse:r,operationType:n})}static async _forOperation(e,n,r){await e._updateTokensIfNecessary(r,!0);const i=Ev(r);return new Ps({user:e,providerId:i,_tokenResponse:r,operationType:n})}}function Ev(t){return t.providerId?t.providerId:"phoneNumber"in t?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tc extends ur{constructor(e,n,r,i){var s;super(n.code,n.message),this.operationType=r,this.user=i,Object.setPrototypeOf(this,tc.prototype),this.customData={appName:e.name,tenantId:(s=e.tenantId)!==null&&s!==void 0?s:void 0,_serverResponse:n.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,n,r,i){return new tc(e,n,r,i)}}function SI(t,e,n,r){return(e==="reauthenticate"?n._getReauthenticationResolver(t):n._getIdTokenResponse(t)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?tc._fromErrorAndOperation(t,s,e,r):s})}async function Ux(t,e,n=!1){const r=await ka(t,e._linkToIdToken(t.auth,await t.getIdToken()),n);return Ps._forOperation(t,"link",r)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function $x(t,e,n=!1){const{auth:r}=t;if(wn(r.app))return Promise.reject(Vr(r));const i="reauthenticate";try{const s=await ka(t,SI(r,i,e,t),n);Q(s.idToken,r,"internal-error");const o=Nm(s.idToken);Q(o,r,"internal-error");const{sub:l}=o;return Q(t.uid===l,r,"user-mismatch"),Ps._forOperation(t,i,s)}catch(s){throw(s==null?void 0:s.code)==="auth/user-not-found"&&An(r,"user-mismatch"),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Bx(t,e,n=!1){if(wn(t.app))return Promise.reject(Vr(t));const r="signIn",i=await SI(t,r,e),s=await Ps._fromIdTokenResponse(t,r,i);return n||await t._updateCurrentUser(s.user),s}function zx(t,e,n,r){return Je(t).onIdTokenChanged(e,n,r)}function Wx(t,e,n){return Je(t).beforeAuthStateChanged(e,n)}function Hx(t,e,n,r){return Je(t).onAuthStateChanged(e,n,r)}function qx(t){return Je(t).signOut()}const nc="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class CI{constructor(e,n){this.storageRetriever=e,this.type=n}_isAvailable(){try{return this.storage?(this.storage.setItem(nc,"1"),this.storage.removeItem(nc),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,n){return this.storage.setItem(e,JSON.stringify(n)),Promise.resolve()}_get(e){const n=this.storage.getItem(e);return Promise.resolve(n?JSON.parse(n):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gx=1e3,Kx=10;class kI extends CI{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,n)=>this.onStorageEvent(e,n),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=wI(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const n of Object.keys(this.listeners)){const r=this.storage.getItem(n),i=this.localCache[n];r!==i&&e(n,i,r)}}onStorageEvent(e,n=!1){if(!e.key){this.forAllChangedKeys((o,l,u)=>{this.notifyListeners(o,u)});return}const r=e.key;n?this.detachListener():this.stopPolling();const i=()=>{const o=this.storage.getItem(r);!n&&this.localCache[r]===o||this.notifyListeners(r,o)},s=this.storage.getItem(r);Sx()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,Kx):i()}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const i of Array.from(r))i(n&&JSON.parse(n))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,n,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:n,newValue:r}),!0)})},Gx)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,n){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,n){await super._set(e,n),this.localCache[e]=JSON.stringify(n)}async _get(e){const n=await super._get(e);return this.localCache[e]=JSON.stringify(n),n}async _remove(e){await super._remove(e),delete this.localCache[e]}}kI.type="LOCAL";const Qx=kI;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class RI extends CI{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,n){}_removeListener(e,n){}}RI.type="SESSION";const AI=RI;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yx(t){return Promise.all(t.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(n){return{fulfilled:!1,reason:n}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jc{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const n=this.receivers.find(i=>i.isListeningto(e));if(n)return n;const r=new Jc(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const n=e,{eventId:r,eventType:i,data:s}=n.data,o=this.handlersMap[i];if(!(o!=null&&o.size))return;n.ports[0].postMessage({status:"ack",eventId:r,eventType:i});const l=Array.from(o).map(async c=>c(n.origin,s)),u=await Yx(l);n.ports[0].postMessage({status:"done",eventId:r,eventType:i,response:u})}_subscribe(e,n){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(n)}_unsubscribe(e,n){this.handlersMap[e]&&n&&this.handlersMap[e].delete(n),(!n||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Jc.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bm(t="",e=10){let n="";for(let r=0;r<e;r++)n+=Math.floor(Math.random()*10);return t+n}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xx{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,n,r=50){const i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((l,u)=>{const c=bm("",20);i.port1.start();const d=setTimeout(()=>{u(new Error("unsupported_event"))},r);o={messageChannel:i,onMessage(p){const m=p;if(m.data.eventId===c)switch(m.data.status){case"ack":clearTimeout(d),s=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),l(m.data.response);break;default:clearTimeout(d),clearTimeout(s),u(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:c,data:n},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cn(){return window}function Jx(t){Cn().location.href=t}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function NI(){return typeof Cn().WorkerGlobalScope<"u"&&typeof Cn().importScripts=="function"}async function Zx(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function eb(){var t;return((t=navigator==null?void 0:navigator.serviceWorker)===null||t===void 0?void 0:t.controller)||null}function tb(){return NI()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const PI="firebaseLocalStorageDb",nb=1,rc="firebaseLocalStorage",xI="fbase_key";class el{constructor(e){this.request=e}toPromise(){return new Promise((e,n)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{n(this.request.error)})})}}function Zc(t,e){return t.transaction([rc],e?"readwrite":"readonly").objectStore(rc)}function rb(){const t=indexedDB.deleteDatabase(PI);return new el(t).toPromise()}function Bf(){const t=indexedDB.open(PI,nb);return new Promise((e,n)=>{t.addEventListener("error",()=>{n(t.error)}),t.addEventListener("upgradeneeded",()=>{const r=t.result;try{r.createObjectStore(rc,{keyPath:xI})}catch(i){n(i)}}),t.addEventListener("success",async()=>{const r=t.result;r.objectStoreNames.contains(rc)?e(r):(r.close(),await rb(),e(await Bf()))})})}async function Tv(t,e,n){const r=Zc(t,!0).put({[xI]:e,value:n});return new el(r).toPromise()}async function ib(t,e){const n=Zc(t,!1).get(e),r=await new el(n).toPromise();return r===void 0?null:r.value}function Iv(t,e){const n=Zc(t,!0).delete(e);return new el(n).toPromise()}const sb=800,ob=3;class bI{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await Bf(),this.db)}async _withRetries(e){let n=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(n++>ob)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return NI()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Jc._getInstance(tb()),this.receiver._subscribe("keyChanged",async(e,n)=>({keyProcessed:(await this._poll()).includes(n.key)})),this.receiver._subscribe("ping",async(e,n)=>["keyChanged"])}async initializeSender(){var e,n;if(this.activeServiceWorker=await Zx(),!this.activeServiceWorker)return;this.sender=new Xx(this.activeServiceWorker);const r=await this.sender._send("ping",{},800);r&&!((e=r[0])===null||e===void 0)&&e.fulfilled&&!((n=r[0])===null||n===void 0)&&n.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||eb()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await Bf();return await Tv(e,nc,"1"),await Iv(e,nc),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,n){return this._withPendingWrite(async()=>(await this._withRetries(r=>Tv(r,e,n)),this.localCache[e]=n,this.notifyServiceWorker(e)))}async _get(e){const n=await this._withRetries(r=>ib(r,e));return this.localCache[e]=n,n}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(n=>Iv(n,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(i=>{const s=Zc(i,!1).getAll();return new el(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const n=[],r=new Set;if(e.length!==0)for(const{fbase_key:i,value:s}of e)r.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),n.push(i));for(const i of Object.keys(this.localCache))this.localCache[i]&&!r.has(i)&&(this.notifyListeners(i,null),n.push(i));return n}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const i of Array.from(r))i(n)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),sb)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,n){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}bI.type="LOCAL";const ab=bI;new Xa(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Dm(t,e){return e?Gn(e):(Q(t._popupRedirectResolver,t,"argument-error"),t._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mm extends II{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return gs(e,this._buildIdpRequest())}_linkToIdToken(e,n){return gs(e,this._buildIdpRequest(n))}_getReauthenticationResolver(e){return gs(e,this._buildIdpRequest())}_buildIdpRequest(e){const n={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(n.idToken=e),n}}function lb(t){return Bx(t.auth,new Mm(t),t.bypassAuthState)}function ub(t){const{auth:e,user:n}=t;return Q(n,e,"internal-error"),$x(n,new Mm(t),t.bypassAuthState)}async function cb(t){const{auth:e,user:n}=t;return Q(n,e,"internal-error"),Ux(n,new Mm(t),t.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class DI{constructor(e,n,r,i,s=!1){this.auth=e,this.resolver=r,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(n)?n:[n]}execute(){return new Promise(async(e,n)=>{this.pendingPromise={resolve:e,reject:n};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:n,sessionId:r,postBody:i,tenantId:s,error:o,type:l}=e;if(o){this.reject(o);return}const u={auth:this.auth,requestUri:n,sessionId:r,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(l)(u))}catch(c){this.reject(c)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return lb;case"linkViaPopup":case"linkViaRedirect":return cb;case"reauthViaPopup":case"reauthViaRedirect":return ub;default:An(this.auth,"internal-error")}}resolve(e){ir(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){ir(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hb=new Xa(2e3,1e4);async function db(t,e,n){if(wn(t.app))return Promise.reject(dn(t,"operation-not-supported-in-this-environment"));const r=Ja(t);oI(t,e,Xc);const i=Dm(r,n);return new hi(r,"signInViaPopup",e,i).executeNotNull()}class hi extends DI{constructor(e,n,r,i,s){super(e,n,i,s),this.provider=r,this.authWindow=null,this.pollId=null,hi.currentPopupAction&&hi.currentPopupAction.cancel(),hi.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return Q(e,this.auth,"internal-error"),e}async onExecution(){ir(this.filter.length===1,"Popup operations only handle one event");const e=bm();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(n=>{this.reject(n)}),this.resolver._isIframeWebStorageSupported(this.auth,n=>{n||this.reject(dn(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)===null||e===void 0?void 0:e.associatedEvent)||null}cancel(){this.reject(dn(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,hi.currentPopupAction=null}pollUserCancellation(){const e=()=>{var n,r;if(!((r=(n=this.authWindow)===null||n===void 0?void 0:n.window)===null||r===void 0)&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(dn(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,hb.get())};e()}}hi.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fb="pendingRedirect",gu=new Map;class pb extends DI{constructor(e,n,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],n,void 0,r),this.eventId=null}async execute(){let e=gu.get(this.auth._key());if(!e){try{const r=await mb(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(n){e=()=>Promise.reject(n)}gu.set(this.auth._key(),e)}return this.bypassAuthState||gu.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const n=await this.auth._redirectUserForId(e.eventId);if(n)return this.user=n,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function mb(t,e){const n=OI(e),r=MI(t);if(!await r._isAvailable())return!1;const i=await r._get(n)==="true";return await r._remove(n),i}async function gb(t,e){return MI(t)._set(OI(e),"true")}function _b(t,e){gu.set(t._key(),e)}function MI(t){return Gn(t._redirectPersistence)}function OI(t){return mu(fb,t.config.apiKey,t.name)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yb(t,e,n){return vb(t,e,n)}async function vb(t,e,n){if(wn(t.app))return Promise.reject(Vr(t));const r=Ja(t);oI(t,e,Xc),await r._initializationPromise;const i=Dm(r,n);return await gb(i,r),i._openRedirect(r,e,"signInViaRedirect")}async function wb(t,e,n=!1){if(wn(t.app))return Promise.reject(Vr(t));const r=Ja(t),i=Dm(r,e),o=await new pb(r,i,n).execute();return o&&!n&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Eb=10*60*1e3;class Tb{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let n=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(n=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!Ib(e)||(this.hasHandledPotentialRedirect=!0,n||(this.queuedRedirectEvent=e,n=!0)),n}sendToConsumer(e,n){var r;if(e.error&&!LI(e)){const i=((r=e.error.code)===null||r===void 0?void 0:r.split("auth/")[1])||"internal-error";n.onError(dn(this.auth,i))}else n.onAuthEvent(e)}isEventForConsumer(e,n){const r=n.eventId===null||!!e.eventId&&e.eventId===n.eventId;return n.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=Eb&&this.cachedEventUids.clear(),this.cachedEventUids.has(Sv(e))}saveEventToCache(e){this.cachedEventUids.add(Sv(e)),this.lastProcessedEventTime=Date.now()}}function Sv(t){return[t.type,t.eventId,t.sessionId,t.tenantId].filter(e=>e).join("-")}function LI({type:t,error:e}){return t==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function Ib(t){switch(t.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return LI(t);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Sb(t,e={}){return Ks(t,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Cb=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,kb=/^https?/;async function Rb(t){if(t.config.emulator)return;const{authorizedDomains:e}=await Sb(t);for(const n of e)try{if(Ab(n))return}catch{}An(t,"unauthorized-domain")}function Ab(t){const e=Uf(),{protocol:n,hostname:r}=new URL(e);if(t.startsWith("chrome-extension://")){const o=new URL(t);return o.hostname===""&&r===""?n==="chrome-extension:"&&t.replace("chrome-extension://","")===e.replace("chrome-extension://",""):n==="chrome-extension:"&&o.hostname===r}if(!kb.test(n))return!1;if(Cb.test(t))return r===t;const i=t.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(r)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nb=new Xa(3e4,6e4);function Cv(){const t=Cn().___jsl;if(t!=null&&t.H){for(const e of Object.keys(t.H))if(t.H[e].r=t.H[e].r||[],t.H[e].L=t.H[e].L||[],t.H[e].r=[...t.H[e].L],t.CP)for(let n=0;n<t.CP.length;n++)t.CP[n]=null}}function Pb(t){return new Promise((e,n)=>{var r,i,s;function o(){Cv(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Cv(),n(dn(t,"network-request-failed"))},timeout:Nb.get()})}if(!((i=(r=Cn().gapi)===null||r===void 0?void 0:r.iframes)===null||i===void 0)&&i.Iframe)e(gapi.iframes.getContext());else if(!((s=Cn().gapi)===null||s===void 0)&&s.load)o();else{const l=Dx("iframefcb");return Cn()[l]=()=>{gapi.load?o():n(dn(t,"network-request-failed"))},xx(`${bx()}?onload=${l}`).catch(u=>n(u))}}).catch(e=>{throw _u=null,e})}let _u=null;function xb(t){return _u=_u||Pb(t),_u}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bb=new Xa(5e3,15e3),Db="__/auth/iframe",Mb="emulator/auth/iframe",Ob={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},Lb=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function Vb(t){const e=t.config;Q(e.authDomain,t,"auth-domain-config-required");const n=e.emulator?Rm(e,Mb):`https://${t.config.authDomain}/${Db}`,r={apiKey:e.apiKey,appName:t.name,v:Oi},i=Lb.get(t.config.apiHost);i&&(r.eid=i);const s=t._getFrameworks();return s.length&&(r.fw=s.join(",")),`${n}?${Gs(r).slice(1)}`}async function Fb(t){const e=await xb(t),n=Cn().gapi;return Q(n,t,"internal-error"),e.open({where:document.body,url:Vb(t),messageHandlersFilter:n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:Ob,dontclear:!0},r=>new Promise(async(i,s)=>{await r.restyle({setHideOnLeave:!1});const o=dn(t,"network-request-failed"),l=Cn().setTimeout(()=>{s(o)},bb.get());function u(){Cn().clearTimeout(l),i(r)}r.ping(u).then(u,()=>{s(o)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jb={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},Ub=500,$b=600,Bb="_blank",zb="http://localhost";class kv{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function Wb(t,e,n,r=Ub,i=$b){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString();let l="";const u=Object.assign(Object.assign({},jb),{width:r.toString(),height:i.toString(),top:s,left:o}),c=wt().toLowerCase();n&&(l=mI(c)?Bb:n),fI(c)&&(e=e||zb,u.scrollbars="yes");const d=Object.entries(u).reduce((m,[E,k])=>`${m}${E}=${k},`,"");if(Ix(c)&&l!=="_self")return Hb(e||"",l),new kv(null);const p=window.open(e||"",l,d);Q(p,t,"popup-blocked");try{p.focus()}catch{}return new kv(p)}function Hb(t,e){const n=document.createElement("a");n.href=t,n.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),n.dispatchEvent(r)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qb="__/auth/handler",Gb="emulator/auth/handler",Kb=encodeURIComponent("fac");async function Rv(t,e,n,r,i,s){Q(t.config.authDomain,t,"auth-domain-config-required"),Q(t.config.apiKey,t,"invalid-api-key");const o={apiKey:t.config.apiKey,appName:t.name,authType:n,redirectUrl:r,v:Oi,eventId:i};if(e instanceof Xc){e.setDefaultLanguage(t.languageCode),o.providerId=e.providerId||"",Mf(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[d,p]of Object.entries({}))o[d]=p}if(e instanceof Za){const d=e.getScopes().filter(p=>p!=="");d.length>0&&(o.scopes=d.join(","))}t.tenantId&&(o.tid=t.tenantId);const l=o;for(const d of Object.keys(l))l[d]===void 0&&delete l[d];const u=await t._getAppCheckToken(),c=u?`#${Kb}=${encodeURIComponent(u)}`:"";return`${Qb(t)}?${Gs(l).slice(1)}${c}`}function Qb({config:t}){return t.emulator?Rm(t,Gb):`https://${t.authDomain}/${qb}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ed="webStorageSupport";class Yb{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=AI,this._completeRedirectFn=wb,this._overrideRedirectResult=_b}async _openPopup(e,n,r,i){var s;ir((s=this.eventManagers[e._key()])===null||s===void 0?void 0:s.manager,"_initialize() not called before _openPopup()");const o=await Rv(e,n,r,Uf(),i);return Wb(e,o,bm())}async _openRedirect(e,n,r,i){await this._originValidation(e);const s=await Rv(e,n,r,Uf(),i);return Jx(s),new Promise(()=>{})}_initialize(e){const n=e._key();if(this.eventManagers[n]){const{manager:i,promise:s}=this.eventManagers[n];return i?Promise.resolve(i):(ir(s,"If manager is not set, promise should be"),s)}const r=this.initAndGetManager(e);return this.eventManagers[n]={promise:r},r.catch(()=>{delete this.eventManagers[n]}),r}async initAndGetManager(e){const n=await Fb(e),r=new Tb(e);return n.register("authEvent",i=>(Q(i==null?void 0:i.authEvent,e,"invalid-auth-event"),{status:r.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=n,r}_isIframeWebStorageSupported(e,n){this.iframes[e._key()].send(Ed,{type:Ed},i=>{var s;const o=(s=i==null?void 0:i[0])===null||s===void 0?void 0:s[Ed];o!==void 0&&n(!!o),An(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const n=e._key();return this.originValidationPromises[n]||(this.originValidationPromises[n]=Rb(e)),this.originValidationPromises[n]}get _shouldInitProactively(){return wI()||pI()||Pm()}}const Xb=Yb;var Av="@firebase/auth",Nv="1.7.9";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jb{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)===null||e===void 0?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const n=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,n),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const n=this.internalListeners.get(e);n&&(this.internalListeners.delete(e),n(),this.updateProactiveRefresh())}assertAuthConfigured(){Q(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zb(t){switch(t){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function eD(t){Ci(new zr("auth",(e,{options:n})=>{const r=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:l}=r.options;Q(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});const u={apiKey:o,authDomain:l,clientPlatform:t,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:EI(t)},c=new Nx(r,i,s,u);return Ox(c,n),c},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,n,r)=>{e.getProvider("auth-internal").initialize()})),Ci(new zr("auth-internal",e=>{const n=Ja(e.getProvider("auth").getImmediate());return(r=>new Jb(r))(n)},"PRIVATE").setInstantiationMode("EXPLICIT")),Sn(Av,Nv,Zb(t)),Sn(Av,Nv,"esm2017")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tD=5*60,nD=Q0("authIdTokenMaxAge")||tD;let Pv=null;const rD=t=>async e=>{const n=e&&await e.getIdTokenResult(),r=n&&(new Date().getTime()-Date.parse(n.issuedAtTime))/1e3;if(r&&r>nD)return;const i=n==null?void 0:n.token;Pv!==i&&(Pv=i,await fetch(t,{method:i?"POST":"DELETE",headers:i?{Authorization:`Bearer ${i}`}:{}}))};function iD(t=Im()){const e=Yc(t,"auth");if(e.isInitialized())return e.getImmediate();const n=Mx(t,{popupRedirectResolver:Xb,persistence:[ab,Qx,AI]}),r=Q0("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const s=new URL(r,location.origin);if(location.origin===s.origin){const o=rD(s.toString());Wx(n,o,()=>o(n.currentUser)),zx(n,l=>o(l))}}const i=q0("auth");return i&&Lx(n,`http://${i}`),n}function sD(){var t,e;return(e=(t=document.getElementsByTagName("head"))===null||t===void 0?void 0:t[0])!==null&&e!==void 0?e:document}Px({loadJS(t){return new Promise((e,n)=>{const r=document.createElement("script");r.setAttribute("src",t),r.onload=e,r.onerror=i=>{const s=dn("internal-error");s.customData=i,n(s)},r.type="text/javascript",r.charset="UTF-8",sD().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});eD("Browser");var xv={};const bv="@firebase/database",Dv="1.0.8";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let VI="";function oD(t){VI=t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class aD{constructor(e){this.domStorage_=e,this.prefix_="firebase:"}set(e,n){n==null?this.domStorage_.removeItem(this.prefixedName_(e)):this.domStorage_.setItem(this.prefixedName_(e),Be(n))}get(e){const n=this.domStorage_.getItem(this.prefixedName_(e));return n==null?null:Sa(n)}remove(e){this.domStorage_.removeItem(this.prefixedName_(e))}prefixedName_(e){return this.prefix_+e}toString(){return this.domStorage_.toString()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lD{constructor(){this.cache_={},this.isInMemoryStorage=!0}set(e,n){n==null?delete this.cache_[e]:this.cache_[e]=n}get(e){return cr(this.cache_,e)?this.cache_[e]:null}remove(e){delete this.cache_[e]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const FI=function(t){try{if(typeof window<"u"&&typeof window[t]<"u"){const e=window[t];return e.setItem("firebase:sentinel","cache"),e.removeItem("firebase:sentinel"),new aD(e)}}catch{}return new lD},di=FI("localStorage"),uD=FI("sessionStorage");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _s=new Qc("@firebase/database"),cD=function(){let t=1;return function(){return t++}}(),jI=function(t){const e=YP(t),n=new qP;n.update(e);const r=n.digest();return vm.encodeByteArray(r)},tl=function(...t){let e="";for(let n=0;n<t.length;n++){const r=t[n];Array.isArray(r)||r&&typeof r=="object"&&typeof r.length=="number"?e+=tl.apply(null,r):typeof r=="object"?e+=Be(r):e+=r,e+=" "}return e};let Ko=null,Mv=!0;const hD=function(t,e){U(!0,"Can't turn on custom loggers persistently."),_s.logLevel=ie.VERBOSE,Ko=_s.log.bind(_s)},gt=function(...t){if(Mv===!0&&(Mv=!1,Ko===null&&uD.get("logging_enabled")===!0&&hD()),Ko){const e=tl.apply(null,t);Ko(e)}},nl=function(t){return function(...e){gt(t,...e)}},zf=function(...t){const e="FIREBASE INTERNAL ERROR: "+tl(...t);_s.error(e)},sr=function(...t){const e=`FIREBASE FATAL ERROR: ${tl(...t)}`;throw _s.error(e),new Error(e)},Ot=function(...t){const e="FIREBASE WARNING: "+tl(...t);_s.warn(e)},dD=function(){typeof window<"u"&&window.location&&window.location.protocol&&window.location.protocol.indexOf("https:")!==-1&&Ot("Insecure Firebase access from a secure page. Please use https in calls to new Firebase().")},UI=function(t){return typeof t=="number"&&(t!==t||t===Number.POSITIVE_INFINITY||t===Number.NEGATIVE_INFINITY)},fD=function(t){if(document.readyState==="complete")t();else{let e=!1;const n=function(){if(!document.body){setTimeout(n,Math.floor(10));return}e||(e=!0,t())};document.addEventListener?(document.addEventListener("DOMContentLoaded",n,!1),window.addEventListener("load",n,!1)):document.attachEvent&&(document.attachEvent("onreadystatechange",()=>{document.readyState==="complete"&&n()}),window.attachEvent("onload",n))}},xs="[MIN_NAME]",Ri="[MAX_NAME]",Qs=function(t,e){if(t===e)return 0;if(t===xs||e===Ri)return-1;if(e===xs||t===Ri)return 1;{const n=Ov(t),r=Ov(e);return n!==null?r!==null?n-r===0?t.length-e.length:n-r:-1:r!==null?1:t<e?-1:1}},pD=function(t,e){return t===e?0:t<e?-1:1},So=function(t,e){if(e&&t in e)return e[t];throw new Error("Missing required key ("+t+") in object: "+Be(e))},Om=function(t){if(typeof t!="object"||t===null)return Be(t);const e=[];for(const r in t)e.push(r);e.sort();let n="{";for(let r=0;r<e.length;r++)r!==0&&(n+=","),n+=Be(e[r]),n+=":",n+=Om(t[e[r]]);return n+="}",n},$I=function(t,e){const n=t.length;if(n<=e)return[t];const r=[];for(let i=0;i<n;i+=e)i+e>n?r.push(t.substring(i,n)):r.push(t.substring(i,i+e));return r};function Lt(t,e){for(const n in t)t.hasOwnProperty(n)&&e(n,t[n])}const BI=function(t){U(!UI(t),"Invalid JSON number");const e=11,n=52,r=(1<<e-1)-1;let i,s,o,l,u;t===0?(s=0,o=0,i=1/t===-1/0?1:0):(i=t<0,t=Math.abs(t),t>=Math.pow(2,1-r)?(l=Math.min(Math.floor(Math.log(t)/Math.LN2),r),s=l+r,o=Math.round(t*Math.pow(2,n-l)-Math.pow(2,n))):(s=0,o=Math.round(t/Math.pow(2,1-r-n))));const c=[];for(u=n;u;u-=1)c.push(o%2?1:0),o=Math.floor(o/2);for(u=e;u;u-=1)c.push(s%2?1:0),s=Math.floor(s/2);c.push(i?1:0),c.reverse();const d=c.join("");let p="";for(u=0;u<64;u+=8){let m=parseInt(d.substr(u,8),2).toString(16);m.length===1&&(m="0"+m),p=p+m}return p.toLowerCase()},mD=function(){return!!(typeof window=="object"&&window.chrome&&window.chrome.extension&&!/^chrome/.test(window.location.href))},gD=function(){return typeof Windows=="object"&&typeof Windows.UI=="object"};function _D(t,e){let n="Unknown Error";t==="too_big"?n="The data requested exceeds the maximum size that can be accessed with a single request.":t==="permission_denied"?n="Client doesn't have permission to access the desired data.":t==="unavailable"&&(n="The service is unavailable");const r=new Error(t+" at "+e._path.toString()+": "+n);return r.code=t.toUpperCase(),r}const yD=new RegExp("^-?(0*)\\d{1,10}$"),vD=-2147483648,wD=2147483647,Ov=function(t){if(yD.test(t)){const e=Number(t);if(e>=vD&&e<=wD)return e}return null},Ys=function(t){try{t()}catch(e){setTimeout(()=>{const n=e.stack||"";throw Ot("Exception was thrown by user callback.",n),e},Math.floor(0))}},ED=function(){return(typeof window=="object"&&window.navigator&&window.navigator.userAgent||"").search(/googlebot|google webmaster tools|bingbot|yahoo! slurp|baiduspider|yandexbot|duckduckbot/i)>=0},Qo=function(t,e){const n=setTimeout(t,e);return typeof n=="number"&&typeof Deno<"u"&&Deno.unrefTimer?Deno.unrefTimer(n):typeof n=="object"&&n.unref&&n.unref(),n};/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class TD{constructor(e,n){this.appName_=e,this.appCheckProvider=n,this.appCheck=n==null?void 0:n.getImmediate({optional:!0}),this.appCheck||n==null||n.get().then(r=>this.appCheck=r)}getToken(e){return this.appCheck?this.appCheck.getToken(e):new Promise((n,r)=>{setTimeout(()=>{this.appCheck?this.getToken(e).then(n,r):n(null)},0)})}addTokenChangeListener(e){var n;(n=this.appCheckProvider)===null||n===void 0||n.get().then(r=>r.addTokenListener(e))}notifyForInvalidToken(){Ot(`Provided AppCheck credentials for the app named "${this.appName_}" are invalid. This usually indicates your app was not initialized correctly.`)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ID{constructor(e,n,r){this.appName_=e,this.firebaseOptions_=n,this.authProvider_=r,this.auth_=null,this.auth_=r.getImmediate({optional:!0}),this.auth_||r.onInit(i=>this.auth_=i)}getToken(e){return this.auth_?this.auth_.getToken(e).catch(n=>n&&n.code==="auth/token-not-initialized"?(gt("Got auth/token-not-initialized error.  Treating as null token."),null):Promise.reject(n)):new Promise((n,r)=>{setTimeout(()=>{this.auth_?this.getToken(e).then(n,r):n(null)},0)})}addTokenChangeListener(e){this.auth_?this.auth_.addAuthTokenListener(e):this.authProvider_.get().then(n=>n.addAuthTokenListener(e))}removeTokenChangeListener(e){this.authProvider_.get().then(n=>n.removeAuthTokenListener(e))}notifyForInvalidToken(){let e='Provided authentication credentials for the app named "'+this.appName_+'" are invalid. This usually indicates your app was not initialized correctly. ';"credential"in this.firebaseOptions_?e+='Make sure the "credential" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.':"serviceAccount"in this.firebaseOptions_?e+='Make sure the "serviceAccount" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.':e+='Make sure the "apiKey" and "databaseURL" properties provided to initializeApp() match the values provided for your app at https://console.firebase.google.com/.',Ot(e)}}class yu{constructor(e){this.accessToken=e}getToken(e){return Promise.resolve({accessToken:this.accessToken})}addTokenChangeListener(e){e(this.accessToken)}removeTokenChangeListener(e){}notifyForInvalidToken(){}}yu.OWNER="owner";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Lm="5",zI="v",WI="s",HI="r",qI="f",GI=/(console\.firebase|firebase-console-\w+\.corp|firebase\.corp)\.google\.com/,KI="ls",QI="p",Wf="ac",YI="websocket",XI="long_polling";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class JI{constructor(e,n,r,i,s=!1,o="",l=!1,u=!1){this.secure=n,this.namespace=r,this.webSocketOnly=i,this.nodeAdmin=s,this.persistenceKey=o,this.includeNamespaceInQueryParams=l,this.isUsingEmulator=u,this._host=e.toLowerCase(),this._domain=this._host.substr(this._host.indexOf(".")+1),this.internalHost=di.get("host:"+e)||this._host}isCacheableHost(){return this.internalHost.substr(0,2)==="s-"}isCustomHost(){return this._domain!=="firebaseio.com"&&this._domain!=="firebaseio-demo.com"}get host(){return this._host}set host(e){e!==this.internalHost&&(this.internalHost=e,this.isCacheableHost()&&di.set("host:"+this._host,this.internalHost))}toString(){let e=this.toURLString();return this.persistenceKey&&(e+="<"+this.persistenceKey+">"),e}toURLString(){const e=this.secure?"https://":"http://",n=this.includeNamespaceInQueryParams?`?ns=${this.namespace}`:"";return`${e}${this.host}/${n}`}}function SD(t){return t.host!==t.internalHost||t.isCustomHost()||t.includeNamespaceInQueryParams}function ZI(t,e,n){U(typeof e=="string","typeof type must == string"),U(typeof n=="object","typeof params must == object");let r;if(e===YI)r=(t.secure?"wss://":"ws://")+t.internalHost+"/.ws?";else if(e===XI)r=(t.secure?"https://":"http://")+t.internalHost+"/.lp?";else throw new Error("Unknown connection type: "+e);SD(t)&&(n.ns=t.namespace);const i=[];return Lt(n,(s,o)=>{i.push(s+"="+o)}),r+i.join("&")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class CD{constructor(){this.counters_={}}incrementCounter(e,n=1){cr(this.counters_,e)||(this.counters_[e]=0),this.counters_[e]+=n}get(){return RP(this.counters_)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Td={},Id={};function Vm(t){const e=t.toString();return Td[e]||(Td[e]=new CD),Td[e]}function kD(t,e){const n=t.toString();return Id[n]||(Id[n]=e()),Id[n]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class RD{constructor(e){this.onMessage_=e,this.pendingResponses=[],this.currentResponseNum=0,this.closeAfterResponse=-1,this.onClose=null}closeAfter(e,n){this.closeAfterResponse=e,this.onClose=n,this.closeAfterResponse<this.currentResponseNum&&(this.onClose(),this.onClose=null)}handleResponse(e,n){for(this.pendingResponses[e]=n;this.pendingResponses[this.currentResponseNum];){const r=this.pendingResponses[this.currentResponseNum];delete this.pendingResponses[this.currentResponseNum];for(let i=0;i<r.length;++i)r[i]&&Ys(()=>{this.onMessage_(r[i])});if(this.currentResponseNum===this.closeAfterResponse){this.onClose&&(this.onClose(),this.onClose=null);break}this.currentResponseNum++}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Lv="start",AD="close",ND="pLPCommand",PD="pRTLPCB",eS="id",tS="pw",nS="ser",xD="cb",bD="seg",DD="ts",MD="d",OD="dframe",rS=1870,iS=30,LD=rS-iS,VD=25e3,FD=3e4;class os{constructor(e,n,r,i,s,o,l){this.connId=e,this.repoInfo=n,this.applicationId=r,this.appCheckToken=i,this.authToken=s,this.transportSessionId=o,this.lastSessionId=l,this.bytesSent=0,this.bytesReceived=0,this.everConnected_=!1,this.log_=nl(e),this.stats_=Vm(n),this.urlFn=u=>(this.appCheckToken&&(u[Wf]=this.appCheckToken),ZI(n,XI,u))}open(e,n){this.curSegmentNum=0,this.onDisconnect_=n,this.myPacketOrderer=new RD(e),this.isClosed_=!1,this.connectTimeoutTimer_=setTimeout(()=>{this.log_("Timed out trying to connect."),this.onClosed_(),this.connectTimeoutTimer_=null},Math.floor(FD)),fD(()=>{if(this.isClosed_)return;this.scriptTagHolder=new Fm((...s)=>{const[o,l,u,c,d]=s;if(this.incrementIncomingBytes_(s),!!this.scriptTagHolder)if(this.connectTimeoutTimer_&&(clearTimeout(this.connectTimeoutTimer_),this.connectTimeoutTimer_=null),this.everConnected_=!0,o===Lv)this.id=l,this.password=u;else if(o===AD)l?(this.scriptTagHolder.sendNewPolls=!1,this.myPacketOrderer.closeAfter(l,()=>{this.onClosed_()})):this.onClosed_();else throw new Error("Unrecognized command received: "+o)},(...s)=>{const[o,l]=s;this.incrementIncomingBytes_(s),this.myPacketOrderer.handleResponse(o,l)},()=>{this.onClosed_()},this.urlFn);const r={};r[Lv]="t",r[nS]=Math.floor(Math.random()*1e8),this.scriptTagHolder.uniqueCallbackIdentifier&&(r[xD]=this.scriptTagHolder.uniqueCallbackIdentifier),r[zI]=Lm,this.transportSessionId&&(r[WI]=this.transportSessionId),this.lastSessionId&&(r[KI]=this.lastSessionId),this.applicationId&&(r[QI]=this.applicationId),this.appCheckToken&&(r[Wf]=this.appCheckToken),typeof location<"u"&&location.hostname&&GI.test(location.hostname)&&(r[HI]=qI);const i=this.urlFn(r);this.log_("Connecting via long-poll to "+i),this.scriptTagHolder.addTag(i,()=>{})})}start(){this.scriptTagHolder.startLongPoll(this.id,this.password),this.addDisconnectPingFrame(this.id,this.password)}static forceAllow(){os.forceAllow_=!0}static forceDisallow(){os.forceDisallow_=!0}static isAvailable(){return os.forceAllow_?!0:!os.forceDisallow_&&typeof document<"u"&&document.createElement!=null&&!mD()&&!gD()}markConnectionHealthy(){}shutdown_(){this.isClosed_=!0,this.scriptTagHolder&&(this.scriptTagHolder.close(),this.scriptTagHolder=null),this.myDisconnFrame&&(document.body.removeChild(this.myDisconnFrame),this.myDisconnFrame=null),this.connectTimeoutTimer_&&(clearTimeout(this.connectTimeoutTimer_),this.connectTimeoutTimer_=null)}onClosed_(){this.isClosed_||(this.log_("Longpoll is closing itself"),this.shutdown_(),this.onDisconnect_&&(this.onDisconnect_(this.everConnected_),this.onDisconnect_=null))}close(){this.isClosed_||(this.log_("Longpoll is being closed."),this.shutdown_())}send(e){const n=Be(e);this.bytesSent+=n.length,this.stats_.incrementCounter("bytes_sent",n.length);const r=W0(n),i=$I(r,LD);for(let s=0;s<i.length;s++)this.scriptTagHolder.enqueueSegment(this.curSegmentNum,i.length,i[s]),this.curSegmentNum++}addDisconnectPingFrame(e,n){this.myDisconnFrame=document.createElement("iframe");const r={};r[OD]="t",r[eS]=e,r[tS]=n,this.myDisconnFrame.src=this.urlFn(r),this.myDisconnFrame.style.display="none",document.body.appendChild(this.myDisconnFrame)}incrementIncomingBytes_(e){const n=Be(e).length;this.bytesReceived+=n,this.stats_.incrementCounter("bytes_received",n)}}class Fm{constructor(e,n,r,i){this.onDisconnect=r,this.urlFn=i,this.outstandingRequests=new Set,this.pendingSegs=[],this.currentSerial=Math.floor(Math.random()*1e8),this.sendNewPolls=!0;{this.uniqueCallbackIdentifier=cD(),window[ND+this.uniqueCallbackIdentifier]=e,window[PD+this.uniqueCallbackIdentifier]=n,this.myIFrame=Fm.createIFrame_();let s="";this.myIFrame.src&&this.myIFrame.src.substr(0,11)==="javascript:"&&(s='<script>document.domain="'+document.domain+'";<\/script>');const o="<html><body>"+s+"</body></html>";try{this.myIFrame.doc.open(),this.myIFrame.doc.write(o),this.myIFrame.doc.close()}catch(l){gt("frame writing exception"),l.stack&&gt(l.stack),gt(l)}}}static createIFrame_(){const e=document.createElement("iframe");if(e.style.display="none",document.body){document.body.appendChild(e);try{e.contentWindow.document||gt("No IE domain setting required")}catch{const r=document.domain;e.src="javascript:void((function(){document.open();document.domain='"+r+"';document.close();})())"}}else throw"Document body has not initialized. Wait to initialize Firebase until after the document is ready.";return e.contentDocument?e.doc=e.contentDocument:e.contentWindow?e.doc=e.contentWindow.document:e.document&&(e.doc=e.document),e}close(){this.alive=!1,this.myIFrame&&(this.myIFrame.doc.body.textContent="",setTimeout(()=>{this.myIFrame!==null&&(document.body.removeChild(this.myIFrame),this.myIFrame=null)},Math.floor(0)));const e=this.onDisconnect;e&&(this.onDisconnect=null,e())}startLongPoll(e,n){for(this.myID=e,this.myPW=n,this.alive=!0;this.newRequest_(););}newRequest_(){if(this.alive&&this.sendNewPolls&&this.outstandingRequests.size<(this.pendingSegs.length>0?2:1)){this.currentSerial++;const e={};e[eS]=this.myID,e[tS]=this.myPW,e[nS]=this.currentSerial;let n=this.urlFn(e),r="",i=0;for(;this.pendingSegs.length>0&&this.pendingSegs[0].d.length+iS+r.length<=rS;){const o=this.pendingSegs.shift();r=r+"&"+bD+i+"="+o.seg+"&"+DD+i+"="+o.ts+"&"+MD+i+"="+o.d,i++}return n=n+r,this.addLongPollTag_(n,this.currentSerial),!0}else return!1}enqueueSegment(e,n,r){this.pendingSegs.push({seg:e,ts:n,d:r}),this.alive&&this.newRequest_()}addLongPollTag_(e,n){this.outstandingRequests.add(n);const r=()=>{this.outstandingRequests.delete(n),this.newRequest_()},i=setTimeout(r,Math.floor(VD)),s=()=>{clearTimeout(i),r()};this.addTag(e,s)}addTag(e,n){setTimeout(()=>{try{if(!this.sendNewPolls)return;const r=this.myIFrame.doc.createElement("script");r.type="text/javascript",r.async=!0,r.src=e,r.onload=r.onreadystatechange=function(){const i=r.readyState;(!i||i==="loaded"||i==="complete")&&(r.onload=r.onreadystatechange=null,r.parentNode&&r.parentNode.removeChild(r),n())},r.onerror=()=>{gt("Long-poll script failed to load: "+e),this.sendNewPolls=!1,this.close()},this.myIFrame.doc.body.appendChild(r)}catch{}},Math.floor(1))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jD=16384,UD=45e3;let ic=null;typeof MozWebSocket<"u"?ic=MozWebSocket:typeof WebSocket<"u"&&(ic=WebSocket);class on{constructor(e,n,r,i,s,o,l){this.connId=e,this.applicationId=r,this.appCheckToken=i,this.authToken=s,this.keepaliveTimer=null,this.frames=null,this.totalFrames=0,this.bytesSent=0,this.bytesReceived=0,this.log_=nl(this.connId),this.stats_=Vm(n),this.connURL=on.connectionURL_(n,o,l,i,r),this.nodeAdmin=n.nodeAdmin}static connectionURL_(e,n,r,i,s){const o={};return o[zI]=Lm,typeof location<"u"&&location.hostname&&GI.test(location.hostname)&&(o[HI]=qI),n&&(o[WI]=n),r&&(o[KI]=r),i&&(o[Wf]=i),s&&(o[QI]=s),ZI(e,YI,o)}open(e,n){this.onDisconnect=n,this.onMessage=e,this.log_("Websocket connecting to "+this.connURL),this.everConnected_=!1,di.set("previous_websocket_failure",!0);try{let r;VP(),this.mySock=new ic(this.connURL,[],r)}catch(r){this.log_("Error instantiating WebSocket.");const i=r.message||r.data;i&&this.log_(i),this.onClosed_();return}this.mySock.onopen=()=>{this.log_("Websocket connected."),this.everConnected_=!0},this.mySock.onclose=()=>{this.log_("Websocket connection was disconnected."),this.mySock=null,this.onClosed_()},this.mySock.onmessage=r=>{this.handleIncomingFrame(r)},this.mySock.onerror=r=>{this.log_("WebSocket error.  Closing connection.");const i=r.message||r.data;i&&this.log_(i),this.onClosed_()}}start(){}static forceDisallow(){on.forceDisallow_=!0}static isAvailable(){let e=!1;if(typeof navigator<"u"&&navigator.userAgent){const n=/Android ([0-9]{0,}\.[0-9]{0,})/,r=navigator.userAgent.match(n);r&&r.length>1&&parseFloat(r[1])<4.4&&(e=!0)}return!e&&ic!==null&&!on.forceDisallow_}static previouslyFailed(){return di.isInMemoryStorage||di.get("previous_websocket_failure")===!0}markConnectionHealthy(){di.remove("previous_websocket_failure")}appendFrame_(e){if(this.frames.push(e),this.frames.length===this.totalFrames){const n=this.frames.join("");this.frames=null;const r=Sa(n);this.onMessage(r)}}handleNewFrameCount_(e){this.totalFrames=e,this.frames=[]}extractFrameCount_(e){if(U(this.frames===null,"We already have a frame buffer"),e.length<=6){const n=Number(e);if(!isNaN(n))return this.handleNewFrameCount_(n),null}return this.handleNewFrameCount_(1),e}handleIncomingFrame(e){if(this.mySock===null)return;const n=e.data;if(this.bytesReceived+=n.length,this.stats_.incrementCounter("bytes_received",n.length),this.resetKeepAlive(),this.frames!==null)this.appendFrame_(n);else{const r=this.extractFrameCount_(n);r!==null&&this.appendFrame_(r)}}send(e){this.resetKeepAlive();const n=Be(e);this.bytesSent+=n.length,this.stats_.incrementCounter("bytes_sent",n.length);const r=$I(n,jD);r.length>1&&this.sendString_(String(r.length));for(let i=0;i<r.length;i++)this.sendString_(r[i])}shutdown_(){this.isClosed_=!0,this.keepaliveTimer&&(clearInterval(this.keepaliveTimer),this.keepaliveTimer=null),this.mySock&&(this.mySock.close(),this.mySock=null)}onClosed_(){this.isClosed_||(this.log_("WebSocket is closing itself"),this.shutdown_(),this.onDisconnect&&(this.onDisconnect(this.everConnected_),this.onDisconnect=null))}close(){this.isClosed_||(this.log_("WebSocket is being closed"),this.shutdown_())}resetKeepAlive(){clearInterval(this.keepaliveTimer),this.keepaliveTimer=setInterval(()=>{this.mySock&&this.sendString_("0"),this.resetKeepAlive()},Math.floor(UD))}sendString_(e){try{this.mySock.send(e)}catch(n){this.log_("Exception thrown from WebSocket.send():",n.message||n.data,"Closing connection."),setTimeout(this.onClosed_.bind(this),0)}}}on.responsesRequiredToBeHealthy=2;on.healthyTimeout=3e4;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ra{constructor(e){this.initTransports_(e)}static get ALL_TRANSPORTS(){return[os,on]}static get IS_TRANSPORT_INITIALIZED(){return this.globalTransportInitialized_}initTransports_(e){const n=on&&on.isAvailable();let r=n&&!on.previouslyFailed();if(e.webSocketOnly&&(n||Ot("wss:// URL used, but browser isn't known to support websockets.  Trying anyway."),r=!0),r)this.transports_=[on];else{const i=this.transports_=[];for(const s of Ra.ALL_TRANSPORTS)s&&s.isAvailable()&&i.push(s);Ra.globalTransportInitialized_=!0}}initialTransport(){if(this.transports_.length>0)return this.transports_[0];throw new Error("No transports available")}upgradeTransport(){return this.transports_.length>1?this.transports_[1]:null}}Ra.globalTransportInitialized_=!1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $D=6e4,BD=5e3,zD=10*1024,WD=100*1024,Sd="t",Vv="d",HD="s",Fv="r",qD="e",jv="o",Uv="a",$v="n",Bv="p",GD="h";class KD{constructor(e,n,r,i,s,o,l,u,c,d){this.id=e,this.repoInfo_=n,this.applicationId_=r,this.appCheckToken_=i,this.authToken_=s,this.onMessage_=o,this.onReady_=l,this.onDisconnect_=u,this.onKill_=c,this.lastSessionId=d,this.connectionCount=0,this.pendingDataMessages=[],this.state_=0,this.log_=nl("c:"+this.id+":"),this.transportManager_=new Ra(n),this.log_("Connection created"),this.start_()}start_(){const e=this.transportManager_.initialTransport();this.conn_=new e(this.nextTransportId_(),this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,null,this.lastSessionId),this.primaryResponsesRequired_=e.responsesRequiredToBeHealthy||0;const n=this.connReceiver_(this.conn_),r=this.disconnReceiver_(this.conn_);this.tx_=this.conn_,this.rx_=this.conn_,this.secondaryConn_=null,this.isHealthy_=!1,setTimeout(()=>{this.conn_&&this.conn_.open(n,r)},Math.floor(0));const i=e.healthyTimeout||0;i>0&&(this.healthyTimeout_=Qo(()=>{this.healthyTimeout_=null,this.isHealthy_||(this.conn_&&this.conn_.bytesReceived>WD?(this.log_("Connection exceeded healthy timeout but has received "+this.conn_.bytesReceived+" bytes.  Marking connection healthy."),this.isHealthy_=!0,this.conn_.markConnectionHealthy()):this.conn_&&this.conn_.bytesSent>zD?this.log_("Connection exceeded healthy timeout but has sent "+this.conn_.bytesSent+" bytes.  Leaving connection alive."):(this.log_("Closing unhealthy connection after timeout."),this.close()))},Math.floor(i)))}nextTransportId_(){return"c:"+this.id+":"+this.connectionCount++}disconnReceiver_(e){return n=>{e===this.conn_?this.onConnectionLost_(n):e===this.secondaryConn_?(this.log_("Secondary connection lost."),this.onSecondaryConnectionLost_()):this.log_("closing an old connection")}}connReceiver_(e){return n=>{this.state_!==2&&(e===this.rx_?this.onPrimaryMessageReceived_(n):e===this.secondaryConn_?this.onSecondaryMessageReceived_(n):this.log_("message on old connection"))}}sendRequest(e){const n={t:"d",d:e};this.sendData_(n)}tryCleanupConnection(){this.tx_===this.secondaryConn_&&this.rx_===this.secondaryConn_&&(this.log_("cleaning up and promoting a connection: "+this.secondaryConn_.connId),this.conn_=this.secondaryConn_,this.secondaryConn_=null)}onSecondaryControl_(e){if(Sd in e){const n=e[Sd];n===Uv?this.upgradeIfSecondaryHealthy_():n===Fv?(this.log_("Got a reset on secondary, closing it"),this.secondaryConn_.close(),(this.tx_===this.secondaryConn_||this.rx_===this.secondaryConn_)&&this.close()):n===jv&&(this.log_("got pong on secondary."),this.secondaryResponsesRequired_--,this.upgradeIfSecondaryHealthy_())}}onSecondaryMessageReceived_(e){const n=So("t",e),r=So("d",e);if(n==="c")this.onSecondaryControl_(r);else if(n==="d")this.pendingDataMessages.push(r);else throw new Error("Unknown protocol layer: "+n)}upgradeIfSecondaryHealthy_(){this.secondaryResponsesRequired_<=0?(this.log_("Secondary connection is healthy."),this.isHealthy_=!0,this.secondaryConn_.markConnectionHealthy(),this.proceedWithUpgrade_()):(this.log_("sending ping on secondary."),this.secondaryConn_.send({t:"c",d:{t:Bv,d:{}}}))}proceedWithUpgrade_(){this.secondaryConn_.start(),this.log_("sending client ack on secondary"),this.secondaryConn_.send({t:"c",d:{t:Uv,d:{}}}),this.log_("Ending transmission on primary"),this.conn_.send({t:"c",d:{t:$v,d:{}}}),this.tx_=this.secondaryConn_,this.tryCleanupConnection()}onPrimaryMessageReceived_(e){const n=So("t",e),r=So("d",e);n==="c"?this.onControl_(r):n==="d"&&this.onDataMessage_(r)}onDataMessage_(e){this.onPrimaryResponse_(),this.onMessage_(e)}onPrimaryResponse_(){this.isHealthy_||(this.primaryResponsesRequired_--,this.primaryResponsesRequired_<=0&&(this.log_("Primary connection is healthy."),this.isHealthy_=!0,this.conn_.markConnectionHealthy()))}onControl_(e){const n=So(Sd,e);if(Vv in e){const r=e[Vv];if(n===GD){const i=Object.assign({},r);this.repoInfo_.isUsingEmulator&&(i.h=this.repoInfo_.host),this.onHandshake_(i)}else if(n===$v){this.log_("recvd end transmission on primary"),this.rx_=this.secondaryConn_;for(let i=0;i<this.pendingDataMessages.length;++i)this.onDataMessage_(this.pendingDataMessages[i]);this.pendingDataMessages=[],this.tryCleanupConnection()}else n===HD?this.onConnectionShutdown_(r):n===Fv?this.onReset_(r):n===qD?zf("Server Error: "+r):n===jv?(this.log_("got pong on primary."),this.onPrimaryResponse_(),this.sendPingOnPrimaryIfNecessary_()):zf("Unknown control packet command: "+n)}}onHandshake_(e){const n=e.ts,r=e.v,i=e.h;this.sessionId=e.s,this.repoInfo_.host=i,this.state_===0&&(this.conn_.start(),this.onConnectionEstablished_(this.conn_,n),Lm!==r&&Ot("Protocol version mismatch detected"),this.tryStartUpgrade_())}tryStartUpgrade_(){const e=this.transportManager_.upgradeTransport();e&&this.startUpgrade_(e)}startUpgrade_(e){this.secondaryConn_=new e(this.nextTransportId_(),this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,this.sessionId),this.secondaryResponsesRequired_=e.responsesRequiredToBeHealthy||0;const n=this.connReceiver_(this.secondaryConn_),r=this.disconnReceiver_(this.secondaryConn_);this.secondaryConn_.open(n,r),Qo(()=>{this.secondaryConn_&&(this.log_("Timed out trying to upgrade."),this.secondaryConn_.close())},Math.floor($D))}onReset_(e){this.log_("Reset packet received.  New host: "+e),this.repoInfo_.host=e,this.state_===1?this.close():(this.closeConnections_(),this.start_())}onConnectionEstablished_(e,n){this.log_("Realtime connection established."),this.conn_=e,this.state_=1,this.onReady_&&(this.onReady_(n,this.sessionId),this.onReady_=null),this.primaryResponsesRequired_===0?(this.log_("Primary connection is healthy."),this.isHealthy_=!0):Qo(()=>{this.sendPingOnPrimaryIfNecessary_()},Math.floor(BD))}sendPingOnPrimaryIfNecessary_(){!this.isHealthy_&&this.state_===1&&(this.log_("sending ping on primary."),this.sendData_({t:"c",d:{t:Bv,d:{}}}))}onSecondaryConnectionLost_(){const e=this.secondaryConn_;this.secondaryConn_=null,(this.tx_===e||this.rx_===e)&&this.close()}onConnectionLost_(e){this.conn_=null,!e&&this.state_===0?(this.log_("Realtime connection failed."),this.repoInfo_.isCacheableHost()&&(di.remove("host:"+this.repoInfo_.host),this.repoInfo_.internalHost=this.repoInfo_.host)):this.state_===1&&this.log_("Realtime connection lost."),this.close()}onConnectionShutdown_(e){this.log_("Connection shutdown command received. Shutting down..."),this.onKill_&&(this.onKill_(e),this.onKill_=null),this.onDisconnect_=null,this.close()}sendData_(e){if(this.state_!==1)throw"Connection is not connected";this.tx_.send(e)}close(){this.state_!==2&&(this.log_("Closing realtime connection."),this.state_=2,this.closeConnections_(),this.onDisconnect_&&(this.onDisconnect_(),this.onDisconnect_=null))}closeConnections_(){this.log_("Shutting down all connections"),this.conn_&&(this.conn_.close(),this.conn_=null),this.secondaryConn_&&(this.secondaryConn_.close(),this.secondaryConn_=null),this.healthyTimeout_&&(clearTimeout(this.healthyTimeout_),this.healthyTimeout_=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sS{put(e,n,r,i){}merge(e,n,r,i){}refreshAuthToken(e){}refreshAppCheckToken(e){}onDisconnectPut(e,n,r){}onDisconnectMerge(e,n,r){}onDisconnectCancel(e,n){}reportStats(e){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oS{constructor(e){this.allowedEvents_=e,this.listeners_={},U(Array.isArray(e)&&e.length>0,"Requires a non-empty array")}trigger(e,...n){if(Array.isArray(this.listeners_[e])){const r=[...this.listeners_[e]];for(let i=0;i<r.length;i++)r[i].callback.apply(r[i].context,n)}}on(e,n,r){this.validateEventType_(e),this.listeners_[e]=this.listeners_[e]||[],this.listeners_[e].push({callback:n,context:r});const i=this.getInitialEvent(e);i&&n.apply(r,i)}off(e,n,r){this.validateEventType_(e);const i=this.listeners_[e]||[];for(let s=0;s<i.length;s++)if(i[s].callback===n&&(!r||r===i[s].context)){i.splice(s,1);return}}validateEventType_(e){U(this.allowedEvents_.find(n=>n===e),"Unknown event: "+e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sc extends oS{constructor(){super(["online"]),this.online_=!0,typeof window<"u"&&typeof window.addEventListener<"u"&&!wm()&&(window.addEventListener("online",()=>{this.online_||(this.online_=!0,this.trigger("online",!0))},!1),window.addEventListener("offline",()=>{this.online_&&(this.online_=!1,this.trigger("online",!1))},!1))}static getInstance(){return new sc}getInitialEvent(e){return U(e==="online","Unknown event type: "+e),[this.online_]}currentlyOnline(){return this.online_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zv=32,Wv=768;class ye{constructor(e,n){if(n===void 0){this.pieces_=e.split("/");let r=0;for(let i=0;i<this.pieces_.length;i++)this.pieces_[i].length>0&&(this.pieces_[r]=this.pieces_[i],r++);this.pieces_.length=r,this.pieceNum_=0}else this.pieces_=e,this.pieceNum_=n}toString(){let e="";for(let n=this.pieceNum_;n<this.pieces_.length;n++)this.pieces_[n]!==""&&(e+="/"+this.pieces_[n]);return e||"/"}}function de(){return new ye("")}function se(t){return t.pieceNum_>=t.pieces_.length?null:t.pieces_[t.pieceNum_]}function Wr(t){return t.pieces_.length-t.pieceNum_}function we(t){let e=t.pieceNum_;return e<t.pieces_.length&&e++,new ye(t.pieces_,e)}function aS(t){return t.pieceNum_<t.pieces_.length?t.pieces_[t.pieces_.length-1]:null}function QD(t){let e="";for(let n=t.pieceNum_;n<t.pieces_.length;n++)t.pieces_[n]!==""&&(e+="/"+encodeURIComponent(String(t.pieces_[n])));return e||"/"}function lS(t,e=0){return t.pieces_.slice(t.pieceNum_+e)}function uS(t){if(t.pieceNum_>=t.pieces_.length)return null;const e=[];for(let n=t.pieceNum_;n<t.pieces_.length-1;n++)e.push(t.pieces_[n]);return new ye(e,0)}function ze(t,e){const n=[];for(let r=t.pieceNum_;r<t.pieces_.length;r++)n.push(t.pieces_[r]);if(e instanceof ye)for(let r=e.pieceNum_;r<e.pieces_.length;r++)n.push(e.pieces_[r]);else{const r=e.split("/");for(let i=0;i<r.length;i++)r[i].length>0&&n.push(r[i])}return new ye(n,0)}function ne(t){return t.pieceNum_>=t.pieces_.length}function St(t,e){const n=se(t),r=se(e);if(n===null)return e;if(n===r)return St(we(t),we(e));throw new Error("INTERNAL ERROR: innerPath ("+e+") is not within outerPath ("+t+")")}function cS(t,e){if(Wr(t)!==Wr(e))return!1;for(let n=t.pieceNum_,r=e.pieceNum_;n<=t.pieces_.length;n++,r++)if(t.pieces_[n]!==e.pieces_[r])return!1;return!0}function an(t,e){let n=t.pieceNum_,r=e.pieceNum_;if(Wr(t)>Wr(e))return!1;for(;n<t.pieces_.length;){if(t.pieces_[n]!==e.pieces_[r])return!1;++n,++r}return!0}class YD{constructor(e,n){this.errorPrefix_=n,this.parts_=lS(e,0),this.byteLength_=Math.max(1,this.parts_.length);for(let r=0;r<this.parts_.length;r++)this.byteLength_+=Kc(this.parts_[r]);hS(this)}}function XD(t,e){t.parts_.length>0&&(t.byteLength_+=1),t.parts_.push(e),t.byteLength_+=Kc(e),hS(t)}function JD(t){const e=t.parts_.pop();t.byteLength_-=Kc(e),t.parts_.length>0&&(t.byteLength_-=1)}function hS(t){if(t.byteLength_>Wv)throw new Error(t.errorPrefix_+"has a key path longer than "+Wv+" bytes ("+t.byteLength_+").");if(t.parts_.length>zv)throw new Error(t.errorPrefix_+"path specified exceeds the maximum depth that can be written ("+zv+") or object contains a cycle "+ai(t))}function ai(t){return t.parts_.length===0?"":"in property '"+t.parts_.join(".")+"'"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jm extends oS{constructor(){super(["visible"]);let e,n;typeof document<"u"&&typeof document.addEventListener<"u"&&(typeof document.hidden<"u"?(n="visibilitychange",e="hidden"):typeof document.mozHidden<"u"?(n="mozvisibilitychange",e="mozHidden"):typeof document.msHidden<"u"?(n="msvisibilitychange",e="msHidden"):typeof document.webkitHidden<"u"&&(n="webkitvisibilitychange",e="webkitHidden")),this.visible_=!0,n&&document.addEventListener(n,()=>{const r=!document[e];r!==this.visible_&&(this.visible_=r,this.trigger("visible",r))},!1)}static getInstance(){return new jm}getInitialEvent(e){return U(e==="visible","Unknown event type: "+e),[this.visible_]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Co=1e3,ZD=60*5*1e3,Hv=30*1e3,eM=1.3,tM=3e4,nM="server_kill",qv=3;class Yn extends sS{constructor(e,n,r,i,s,o,l,u){if(super(),this.repoInfo_=e,this.applicationId_=n,this.onDataUpdate_=r,this.onConnectStatus_=i,this.onServerInfoUpdate_=s,this.authTokenProvider_=o,this.appCheckTokenProvider_=l,this.authOverride_=u,this.id=Yn.nextPersistentConnectionId_++,this.log_=nl("p:"+this.id+":"),this.interruptReasons_={},this.listens=new Map,this.outstandingPuts_=[],this.outstandingGets_=[],this.outstandingPutCount_=0,this.outstandingGetCount_=0,this.onDisconnectRequestQueue_=[],this.connected_=!1,this.reconnectDelay_=Co,this.maxReconnectDelay_=ZD,this.securityDebugCallback_=null,this.lastSessionId=null,this.establishConnectionTimer_=null,this.visible_=!1,this.requestCBHash_={},this.requestNumber_=0,this.realtime_=null,this.authToken_=null,this.appCheckToken_=null,this.forceTokenRefresh_=!1,this.invalidAuthTokenCount_=0,this.invalidAppCheckTokenCount_=0,this.firstConnection_=!0,this.lastConnectionAttemptTime_=null,this.lastConnectionEstablishedTime_=null,u)throw new Error("Auth override specified in options, but not supported on non Node.js platforms");jm.getInstance().on("visible",this.onVisible_,this),e.host.indexOf("fblocal")===-1&&sc.getInstance().on("online",this.onOnline_,this)}sendRequest(e,n,r){const i=++this.requestNumber_,s={r:i,a:e,b:n};this.log_(Be(s)),U(this.connected_,"sendRequest call when we're not connected not allowed."),this.realtime_.sendRequest(s),r&&(this.requestCBHash_[i]=r)}get(e){this.initConnection_();const n=new Gc,i={action:"g",request:{p:e._path.toString(),q:e._queryObject},onComplete:o=>{const l=o.d;o.s==="ok"?n.resolve(l):n.reject(l)}};this.outstandingGets_.push(i),this.outstandingGetCount_++;const s=this.outstandingGets_.length-1;return this.connected_&&this.sendGet_(s),n.promise}listen(e,n,r,i){this.initConnection_();const s=e._queryIdentifier,o=e._path.toString();this.log_("Listen called for "+o+" "+s),this.listens.has(o)||this.listens.set(o,new Map),U(e._queryParams.isDefault()||!e._queryParams.loadsAllData(),"listen() called for non-default but complete query"),U(!this.listens.get(o).has(s),"listen() called twice for same path/queryId.");const l={onComplete:i,hashFn:n,query:e,tag:r};this.listens.get(o).set(s,l),this.connected_&&this.sendListen_(l)}sendGet_(e){const n=this.outstandingGets_[e];this.sendRequest("g",n.request,r=>{delete this.outstandingGets_[e],this.outstandingGetCount_--,this.outstandingGetCount_===0&&(this.outstandingGets_=[]),n.onComplete&&n.onComplete(r)})}sendListen_(e){const n=e.query,r=n._path.toString(),i=n._queryIdentifier;this.log_("Listen on "+r+" for "+i);const s={p:r},o="q";e.tag&&(s.q=n._queryObject,s.t=e.tag),s.h=e.hashFn(),this.sendRequest(o,s,l=>{const u=l.d,c=l.s;Yn.warnOnListenWarnings_(u,n),(this.listens.get(r)&&this.listens.get(r).get(i))===e&&(this.log_("listen response",l),c!=="ok"&&this.removeListen_(r,i),e.onComplete&&e.onComplete(c,u))})}static warnOnListenWarnings_(e,n){if(e&&typeof e=="object"&&cr(e,"w")){const r=Ns(e,"w");if(Array.isArray(r)&&~r.indexOf("no_index")){const i='".indexOn": "'+n._queryParams.getIndex().toString()+'"',s=n._path.toString();Ot(`Using an unspecified index. Your data will be downloaded and filtered on the client. Consider adding ${i} at ${s} to your security rules for better performance.`)}}}refreshAuthToken(e){this.authToken_=e,this.log_("Auth token refreshed"),this.authToken_?this.tryAuth():this.connected_&&this.sendRequest("unauth",{},()=>{}),this.reduceReconnectDelayIfAdminCredential_(e)}reduceReconnectDelayIfAdminCredential_(e){(e&&e.length===40||HP(e))&&(this.log_("Admin auth credential detected.  Reducing max reconnect time."),this.maxReconnectDelay_=Hv)}refreshAppCheckToken(e){this.appCheckToken_=e,this.log_("App check token refreshed"),this.appCheckToken_?this.tryAppCheck():this.connected_&&this.sendRequest("unappeck",{},()=>{})}tryAuth(){if(this.connected_&&this.authToken_){const e=this.authToken_,n=WP(e)?"auth":"gauth",r={cred:e};this.authOverride_===null?r.noauth=!0:typeof this.authOverride_=="object"&&(r.authvar=this.authOverride_),this.sendRequest(n,r,i=>{const s=i.s,o=i.d||"error";this.authToken_===e&&(s==="ok"?this.invalidAuthTokenCount_=0:this.onAuthRevoked_(s,o))})}}tryAppCheck(){this.connected_&&this.appCheckToken_&&this.sendRequest("appcheck",{token:this.appCheckToken_},e=>{const n=e.s,r=e.d||"error";n==="ok"?this.invalidAppCheckTokenCount_=0:this.onAppCheckRevoked_(n,r)})}unlisten(e,n){const r=e._path.toString(),i=e._queryIdentifier;this.log_("Unlisten called for "+r+" "+i),U(e._queryParams.isDefault()||!e._queryParams.loadsAllData(),"unlisten() called for non-default but complete query"),this.removeListen_(r,i)&&this.connected_&&this.sendUnlisten_(r,i,e._queryObject,n)}sendUnlisten_(e,n,r,i){this.log_("Unlisten on "+e+" for "+n);const s={p:e},o="n";i&&(s.q=r,s.t=i),this.sendRequest(o,s)}onDisconnectPut(e,n,r){this.initConnection_(),this.connected_?this.sendOnDisconnect_("o",e,n,r):this.onDisconnectRequestQueue_.push({pathString:e,action:"o",data:n,onComplete:r})}onDisconnectMerge(e,n,r){this.initConnection_(),this.connected_?this.sendOnDisconnect_("om",e,n,r):this.onDisconnectRequestQueue_.push({pathString:e,action:"om",data:n,onComplete:r})}onDisconnectCancel(e,n){this.initConnection_(),this.connected_?this.sendOnDisconnect_("oc",e,null,n):this.onDisconnectRequestQueue_.push({pathString:e,action:"oc",data:null,onComplete:n})}sendOnDisconnect_(e,n,r,i){const s={p:n,d:r};this.log_("onDisconnect "+e,s),this.sendRequest(e,s,o=>{i&&setTimeout(()=>{i(o.s,o.d)},Math.floor(0))})}put(e,n,r,i){this.putInternal("p",e,n,r,i)}merge(e,n,r,i){this.putInternal("m",e,n,r,i)}putInternal(e,n,r,i,s){this.initConnection_();const o={p:n,d:r};s!==void 0&&(o.h=s),this.outstandingPuts_.push({action:e,request:o,onComplete:i}),this.outstandingPutCount_++;const l=this.outstandingPuts_.length-1;this.connected_?this.sendPut_(l):this.log_("Buffering put: "+n)}sendPut_(e){const n=this.outstandingPuts_[e].action,r=this.outstandingPuts_[e].request,i=this.outstandingPuts_[e].onComplete;this.outstandingPuts_[e].queued=this.connected_,this.sendRequest(n,r,s=>{this.log_(n+" response",s),delete this.outstandingPuts_[e],this.outstandingPutCount_--,this.outstandingPutCount_===0&&(this.outstandingPuts_=[]),i&&i(s.s,s.d)})}reportStats(e){if(this.connected_){const n={c:e};this.log_("reportStats",n),this.sendRequest("s",n,r=>{if(r.s!=="ok"){const s=r.d;this.log_("reportStats","Error sending stats: "+s)}})}}onDataMessage_(e){if("r"in e){this.log_("from server: "+Be(e));const n=e.r,r=this.requestCBHash_[n];r&&(delete this.requestCBHash_[n],r(e.b))}else{if("error"in e)throw"A server-side error has occurred: "+e.error;"a"in e&&this.onDataPush_(e.a,e.b)}}onDataPush_(e,n){this.log_("handleServerMessage",e,n),e==="d"?this.onDataUpdate_(n.p,n.d,!1,n.t):e==="m"?this.onDataUpdate_(n.p,n.d,!0,n.t):e==="c"?this.onListenRevoked_(n.p,n.q):e==="ac"?this.onAuthRevoked_(n.s,n.d):e==="apc"?this.onAppCheckRevoked_(n.s,n.d):e==="sd"?this.onSecurityDebugPacket_(n):zf("Unrecognized action received from server: "+Be(e)+`
Are you using the latest client?`)}onReady_(e,n){this.log_("connection ready"),this.connected_=!0,this.lastConnectionEstablishedTime_=new Date().getTime(),this.handleTimestamp_(e),this.lastSessionId=n,this.firstConnection_&&this.sendConnectStats_(),this.restoreState_(),this.firstConnection_=!1,this.onConnectStatus_(!0)}scheduleConnect_(e){U(!this.realtime_,"Scheduling a connect when we're already connected/ing?"),this.establishConnectionTimer_&&clearTimeout(this.establishConnectionTimer_),this.establishConnectionTimer_=setTimeout(()=>{this.establishConnectionTimer_=null,this.establishConnection_()},Math.floor(e))}initConnection_(){!this.realtime_&&this.firstConnection_&&this.scheduleConnect_(0)}onVisible_(e){e&&!this.visible_&&this.reconnectDelay_===this.maxReconnectDelay_&&(this.log_("Window became visible.  Reducing delay."),this.reconnectDelay_=Co,this.realtime_||this.scheduleConnect_(0)),this.visible_=e}onOnline_(e){e?(this.log_("Browser went online."),this.reconnectDelay_=Co,this.realtime_||this.scheduleConnect_(0)):(this.log_("Browser went offline.  Killing connection."),this.realtime_&&this.realtime_.close())}onRealtimeDisconnect_(){if(this.log_("data client disconnected"),this.connected_=!1,this.realtime_=null,this.cancelSentTransactions_(),this.requestCBHash_={},this.shouldReconnect_()){this.visible_?this.lastConnectionEstablishedTime_&&(new Date().getTime()-this.lastConnectionEstablishedTime_>tM&&(this.reconnectDelay_=Co),this.lastConnectionEstablishedTime_=null):(this.log_("Window isn't visible.  Delaying reconnect."),this.reconnectDelay_=this.maxReconnectDelay_,this.lastConnectionAttemptTime_=new Date().getTime());const e=new Date().getTime()-this.lastConnectionAttemptTime_;let n=Math.max(0,this.reconnectDelay_-e);n=Math.random()*n,this.log_("Trying to reconnect in "+n+"ms"),this.scheduleConnect_(n),this.reconnectDelay_=Math.min(this.maxReconnectDelay_,this.reconnectDelay_*eM)}this.onConnectStatus_(!1)}async establishConnection_(){if(this.shouldReconnect_()){this.log_("Making a connection attempt"),this.lastConnectionAttemptTime_=new Date().getTime(),this.lastConnectionEstablishedTime_=null;const e=this.onDataMessage_.bind(this),n=this.onReady_.bind(this),r=this.onRealtimeDisconnect_.bind(this),i=this.id+":"+Yn.nextConnectionId_++,s=this.lastSessionId;let o=!1,l=null;const u=function(){l?l.close():(o=!0,r())},c=function(p){U(l,"sendRequest call when we're not connected not allowed."),l.sendRequest(p)};this.realtime_={close:u,sendRequest:c};const d=this.forceTokenRefresh_;this.forceTokenRefresh_=!1;try{const[p,m]=await Promise.all([this.authTokenProvider_.getToken(d),this.appCheckTokenProvider_.getToken(d)]);o?gt("getToken() completed but was canceled"):(gt("getToken() completed. Creating connection."),this.authToken_=p&&p.accessToken,this.appCheckToken_=m&&m.token,l=new KD(i,this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,e,n,r,E=>{Ot(E+" ("+this.repoInfo_.toString()+")"),this.interrupt(nM)},s))}catch(p){this.log_("Failed to get token: "+p),o||(this.repoInfo_.nodeAdmin&&Ot(p),u())}}}interrupt(e){gt("Interrupting connection for reason: "+e),this.interruptReasons_[e]=!0,this.realtime_?this.realtime_.close():(this.establishConnectionTimer_&&(clearTimeout(this.establishConnectionTimer_),this.establishConnectionTimer_=null),this.connected_&&this.onRealtimeDisconnect_())}resume(e){gt("Resuming connection for reason: "+e),delete this.interruptReasons_[e],Mf(this.interruptReasons_)&&(this.reconnectDelay_=Co,this.realtime_||this.scheduleConnect_(0))}handleTimestamp_(e){const n=e-new Date().getTime();this.onServerInfoUpdate_({serverTimeOffset:n})}cancelSentTransactions_(){for(let e=0;e<this.outstandingPuts_.length;e++){const n=this.outstandingPuts_[e];n&&"h"in n.request&&n.queued&&(n.onComplete&&n.onComplete("disconnect"),delete this.outstandingPuts_[e],this.outstandingPutCount_--)}this.outstandingPutCount_===0&&(this.outstandingPuts_=[])}onListenRevoked_(e,n){let r;n?r=n.map(s=>Om(s)).join("$"):r="default";const i=this.removeListen_(e,r);i&&i.onComplete&&i.onComplete("permission_denied")}removeListen_(e,n){const r=new ye(e).toString();let i;if(this.listens.has(r)){const s=this.listens.get(r);i=s.get(n),s.delete(n),s.size===0&&this.listens.delete(r)}else i=void 0;return i}onAuthRevoked_(e,n){gt("Auth token revoked: "+e+"/"+n),this.authToken_=null,this.forceTokenRefresh_=!0,this.realtime_.close(),(e==="invalid_token"||e==="permission_denied")&&(this.invalidAuthTokenCount_++,this.invalidAuthTokenCount_>=qv&&(this.reconnectDelay_=Hv,this.authTokenProvider_.notifyForInvalidToken()))}onAppCheckRevoked_(e,n){gt("App check token revoked: "+e+"/"+n),this.appCheckToken_=null,this.forceTokenRefresh_=!0,(e==="invalid_token"||e==="permission_denied")&&(this.invalidAppCheckTokenCount_++,this.invalidAppCheckTokenCount_>=qv&&this.appCheckTokenProvider_.notifyForInvalidToken())}onSecurityDebugPacket_(e){this.securityDebugCallback_?this.securityDebugCallback_(e):"msg"in e&&console.log("FIREBASE: "+e.msg.replace(`
`,`
FIREBASE: `))}restoreState_(){this.tryAuth(),this.tryAppCheck();for(const e of this.listens.values())for(const n of e.values())this.sendListen_(n);for(let e=0;e<this.outstandingPuts_.length;e++)this.outstandingPuts_[e]&&this.sendPut_(e);for(;this.onDisconnectRequestQueue_.length;){const e=this.onDisconnectRequestQueue_.shift();this.sendOnDisconnect_(e.action,e.pathString,e.data,e.onComplete)}for(let e=0;e<this.outstandingGets_.length;e++)this.outstandingGets_[e]&&this.sendGet_(e)}sendConnectStats_(){const e={};let n="js";e["sdk."+n+"."+VI.replace(/\./g,"-")]=1,wm()?e["framework.cordova"]=1:X0()&&(e["framework.reactnative"]=1),this.reportStats(e)}shouldReconnect_(){const e=sc.getInstance().currentlyOnline();return Mf(this.interruptReasons_)&&e}}Yn.nextPersistentConnectionId_=0;Yn.nextConnectionId_=0;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class te{constructor(e,n){this.name=e,this.node=n}static Wrap(e,n){return new te(e,n)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eh{getCompare(){return this.compare.bind(this)}indexedValueChanged(e,n){const r=new te(xs,e),i=new te(xs,n);return this.compare(r,i)!==0}minPost(){return te.MIN}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ql;class dS extends eh{static get __EMPTY_NODE(){return Ql}static set __EMPTY_NODE(e){Ql=e}compare(e,n){return Qs(e.name,n.name)}isDefinedOn(e){throw qs("KeyIndex.isDefinedOn not expected to be called.")}indexedValueChanged(e,n){return!1}minPost(){return te.MIN}maxPost(){return new te(Ri,Ql)}makePost(e,n){return U(typeof e=="string","KeyIndex indexValue must always be a string."),new te(e,Ql)}toString(){return".key"}}const ys=new dS;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Yl=class{constructor(e,n,r,i,s=null){this.isReverse_=i,this.resultGenerator_=s,this.nodeStack_=[];let o=1;for(;!e.isEmpty();)if(e=e,o=n?r(e.key,n):1,i&&(o*=-1),o<0)this.isReverse_?e=e.left:e=e.right;else if(o===0){this.nodeStack_.push(e);break}else this.nodeStack_.push(e),this.isReverse_?e=e.right:e=e.left}getNext(){if(this.nodeStack_.length===0)return null;let e=this.nodeStack_.pop(),n;if(this.resultGenerator_?n=this.resultGenerator_(e.key,e.value):n={key:e.key,value:e.value},this.isReverse_)for(e=e.left;!e.isEmpty();)this.nodeStack_.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack_.push(e),e=e.left;return n}hasNext(){return this.nodeStack_.length>0}peek(){if(this.nodeStack_.length===0)return null;const e=this.nodeStack_[this.nodeStack_.length-1];return this.resultGenerator_?this.resultGenerator_(e.key,e.value):{key:e.key,value:e.value}}},Ut=class Do{constructor(e,n,r,i,s){this.key=e,this.value=n,this.color=r??Do.RED,this.left=i??En.EMPTY_NODE,this.right=s??En.EMPTY_NODE}copy(e,n,r,i,s){return new Do(e??this.key,n??this.value,r??this.color,i??this.left,s??this.right)}count(){return this.left.count()+1+this.right.count()}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||!!e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min_(){return this.left.isEmpty()?this:this.left.min_()}minKey(){return this.min_().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,n,r){let i=this;const s=r(e,i.key);return s<0?i=i.copy(null,null,null,i.left.insert(e,n,r),null):s===0?i=i.copy(null,n,null,null,null):i=i.copy(null,null,null,null,i.right.insert(e,n,r)),i.fixUp_()}removeMin_(){if(this.left.isEmpty())return En.EMPTY_NODE;let e=this;return!e.left.isRed_()&&!e.left.left.isRed_()&&(e=e.moveRedLeft_()),e=e.copy(null,null,null,e.left.removeMin_(),null),e.fixUp_()}remove(e,n){let r,i;if(r=this,n(e,r.key)<0)!r.left.isEmpty()&&!r.left.isRed_()&&!r.left.left.isRed_()&&(r=r.moveRedLeft_()),r=r.copy(null,null,null,r.left.remove(e,n),null);else{if(r.left.isRed_()&&(r=r.rotateRight_()),!r.right.isEmpty()&&!r.right.isRed_()&&!r.right.left.isRed_()&&(r=r.moveRedRight_()),n(e,r.key)===0){if(r.right.isEmpty())return En.EMPTY_NODE;i=r.right.min_(),r=r.copy(i.key,i.value,null,null,r.right.removeMin_())}r=r.copy(null,null,null,null,r.right.remove(e,n))}return r.fixUp_()}isRed_(){return this.color}fixUp_(){let e=this;return e.right.isRed_()&&!e.left.isRed_()&&(e=e.rotateLeft_()),e.left.isRed_()&&e.left.left.isRed_()&&(e=e.rotateRight_()),e.left.isRed_()&&e.right.isRed_()&&(e=e.colorFlip_()),e}moveRedLeft_(){let e=this.colorFlip_();return e.right.left.isRed_()&&(e=e.copy(null,null,null,null,e.right.rotateRight_()),e=e.rotateLeft_(),e=e.colorFlip_()),e}moveRedRight_(){let e=this.colorFlip_();return e.left.left.isRed_()&&(e=e.rotateRight_(),e=e.colorFlip_()),e}rotateLeft_(){const e=this.copy(null,null,Do.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight_(){const e=this.copy(null,null,Do.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip_(){const e=this.left.copy(null,null,!this.left.color,null,null),n=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,n)}checkMaxDepth_(){const e=this.check_();return Math.pow(2,e)<=this.count()+1}check_(){if(this.isRed_()&&this.left.isRed_())throw new Error("Red node has red child("+this.key+","+this.value+")");if(this.right.isRed_())throw new Error("Right child of ("+this.key+","+this.value+") is red");const e=this.left.check_();if(e!==this.right.check_())throw new Error("Black depths differ");return e+(this.isRed_()?0:1)}};Ut.RED=!0;Ut.BLACK=!1;class rM{copy(e,n,r,i,s){return this}insert(e,n,r){return new Ut(e,n,null)}remove(e,n){return this}count(){return 0}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}check_(){return 0}isRed_(){return!1}}let En=class vu{constructor(e,n=vu.EMPTY_NODE){this.comparator_=e,this.root_=n}insert(e,n){return new vu(this.comparator_,this.root_.insert(e,n,this.comparator_).copy(null,null,Ut.BLACK,null,null))}remove(e){return new vu(this.comparator_,this.root_.remove(e,this.comparator_).copy(null,null,Ut.BLACK,null,null))}get(e){let n,r=this.root_;for(;!r.isEmpty();){if(n=this.comparator_(e,r.key),n===0)return r.value;n<0?r=r.left:n>0&&(r=r.right)}return null}getPredecessorKey(e){let n,r=this.root_,i=null;for(;!r.isEmpty();)if(n=this.comparator_(e,r.key),n===0){if(r.left.isEmpty())return i?i.key:null;for(r=r.left;!r.right.isEmpty();)r=r.right;return r.key}else n<0?r=r.left:n>0&&(i=r,r=r.right);throw new Error("Attempted to find predecessor key for a nonexistent key.  What gives?")}isEmpty(){return this.root_.isEmpty()}count(){return this.root_.count()}minKey(){return this.root_.minKey()}maxKey(){return this.root_.maxKey()}inorderTraversal(e){return this.root_.inorderTraversal(e)}reverseTraversal(e){return this.root_.reverseTraversal(e)}getIterator(e){return new Yl(this.root_,null,this.comparator_,!1,e)}getIteratorFrom(e,n){return new Yl(this.root_,e,this.comparator_,!1,n)}getReverseIteratorFrom(e,n){return new Yl(this.root_,e,this.comparator_,!0,n)}getReverseIterator(e){return new Yl(this.root_,null,this.comparator_,!0,e)}};En.EMPTY_NODE=new rM;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function iM(t,e){return Qs(t.name,e.name)}function Um(t,e){return Qs(t,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Hf;function sM(t){Hf=t}const fS=function(t){return typeof t=="number"?"number:"+BI(t):"string:"+t},pS=function(t){if(t.isLeafNode()){const e=t.val();U(typeof e=="string"||typeof e=="number"||typeof e=="object"&&cr(e,".sv"),"Priority must be a string or number.")}else U(t===Hf||t.isEmpty(),"priority of unexpected type.");U(t===Hf||t.getPriority().isEmpty(),"Priority nodes can't have a priority of their own.")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Gv;class Ge{constructor(e,n=Ge.__childrenNodeConstructor.EMPTY_NODE){this.value_=e,this.priorityNode_=n,this.lazyHash_=null,U(this.value_!==void 0&&this.value_!==null,"LeafNode shouldn't be created with null/undefined value."),pS(this.priorityNode_)}static set __childrenNodeConstructor(e){Gv=e}static get __childrenNodeConstructor(){return Gv}isLeafNode(){return!0}getPriority(){return this.priorityNode_}updatePriority(e){return new Ge(this.value_,e)}getImmediateChild(e){return e===".priority"?this.priorityNode_:Ge.__childrenNodeConstructor.EMPTY_NODE}getChild(e){return ne(e)?this:se(e)===".priority"?this.priorityNode_:Ge.__childrenNodeConstructor.EMPTY_NODE}hasChild(){return!1}getPredecessorChildName(e,n){return null}updateImmediateChild(e,n){return e===".priority"?this.updatePriority(n):n.isEmpty()&&e!==".priority"?this:Ge.__childrenNodeConstructor.EMPTY_NODE.updateImmediateChild(e,n).updatePriority(this.priorityNode_)}updateChild(e,n){const r=se(e);return r===null?n:n.isEmpty()&&r!==".priority"?this:(U(r!==".priority"||Wr(e)===1,".priority must be the last token in a path"),this.updateImmediateChild(r,Ge.__childrenNodeConstructor.EMPTY_NODE.updateChild(we(e),n)))}isEmpty(){return!1}numChildren(){return 0}forEachChild(e,n){return!1}val(e){return e&&!this.getPriority().isEmpty()?{".value":this.getValue(),".priority":this.getPriority().val()}:this.getValue()}hash(){if(this.lazyHash_===null){let e="";this.priorityNode_.isEmpty()||(e+="priority:"+fS(this.priorityNode_.val())+":");const n=typeof this.value_;e+=n+":",n==="number"?e+=BI(this.value_):e+=this.value_,this.lazyHash_=jI(e)}return this.lazyHash_}getValue(){return this.value_}compareTo(e){return e===Ge.__childrenNodeConstructor.EMPTY_NODE?1:e instanceof Ge.__childrenNodeConstructor?-1:(U(e.isLeafNode(),"Unknown node type"),this.compareToLeafNode_(e))}compareToLeafNode_(e){const n=typeof e.value_,r=typeof this.value_,i=Ge.VALUE_TYPE_ORDER.indexOf(n),s=Ge.VALUE_TYPE_ORDER.indexOf(r);return U(i>=0,"Unknown leaf type: "+n),U(s>=0,"Unknown leaf type: "+r),i===s?r==="object"?0:this.value_<e.value_?-1:this.value_===e.value_?0:1:s-i}withIndex(){return this}isIndexed(){return!0}equals(e){if(e===this)return!0;if(e.isLeafNode()){const n=e;return this.value_===n.value_&&this.priorityNode_.equals(n.priorityNode_)}else return!1}}Ge.VALUE_TYPE_ORDER=["object","boolean","number","string"];/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let mS,gS;function oM(t){mS=t}function aM(t){gS=t}class lM extends eh{compare(e,n){const r=e.node.getPriority(),i=n.node.getPriority(),s=r.compareTo(i);return s===0?Qs(e.name,n.name):s}isDefinedOn(e){return!e.getPriority().isEmpty()}indexedValueChanged(e,n){return!e.getPriority().equals(n.getPriority())}minPost(){return te.MIN}maxPost(){return new te(Ri,new Ge("[PRIORITY-POST]",gS))}makePost(e,n){const r=mS(e);return new te(n,new Ge("[PRIORITY-POST]",r))}toString(){return".priority"}}const Oe=new lM;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const uM=Math.log(2);class cM{constructor(e){const n=s=>parseInt(Math.log(s)/uM,10),r=s=>parseInt(Array(s+1).join("1"),2);this.count=n(e+1),this.current_=this.count-1;const i=r(this.count);this.bits_=e+1&i}nextBitIsOne(){const e=!(this.bits_&1<<this.current_);return this.current_--,e}}const oc=function(t,e,n,r){t.sort(e);const i=function(u,c){const d=c-u;let p,m;if(d===0)return null;if(d===1)return p=t[u],m=n?n(p):p,new Ut(m,p.node,Ut.BLACK,null,null);{const E=parseInt(d/2,10)+u,k=i(u,E),x=i(E+1,c);return p=t[E],m=n?n(p):p,new Ut(m,p.node,Ut.BLACK,k,x)}},s=function(u){let c=null,d=null,p=t.length;const m=function(k,x){const P=p-k,S=p;p-=k;const w=i(P+1,S),R=t[P],D=n?n(R):R;E(new Ut(D,R.node,x,null,w))},E=function(k){c?(c.left=k,c=k):(d=k,c=k)};for(let k=0;k<u.count;++k){const x=u.nextBitIsOne(),P=Math.pow(2,u.count-(k+1));x?m(P,Ut.BLACK):(m(P,Ut.BLACK),m(P,Ut.RED))}return d},o=new cM(t.length),l=s(o);return new En(r||e,l)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Cd;const Wi={};class Kn{constructor(e,n){this.indexes_=e,this.indexSet_=n}static get Default(){return U(Wi&&Oe,"ChildrenNode.ts has not been loaded"),Cd=Cd||new Kn({".priority":Wi},{".priority":Oe}),Cd}get(e){const n=Ns(this.indexes_,e);if(!n)throw new Error("No index defined for "+e);return n instanceof En?n:null}hasIndex(e){return cr(this.indexSet_,e.toString())}addIndex(e,n){U(e!==ys,"KeyIndex always exists and isn't meant to be added to the IndexMap.");const r=[];let i=!1;const s=n.getIterator(te.Wrap);let o=s.getNext();for(;o;)i=i||e.isDefinedOn(o.node),r.push(o),o=s.getNext();let l;i?l=oc(r,e.getCompare()):l=Wi;const u=e.toString(),c=Object.assign({},this.indexSet_);c[u]=e;const d=Object.assign({},this.indexes_);return d[u]=l,new Kn(d,c)}addToIndexes(e,n){const r=Yu(this.indexes_,(i,s)=>{const o=Ns(this.indexSet_,s);if(U(o,"Missing index implementation for "+s),i===Wi)if(o.isDefinedOn(e.node)){const l=[],u=n.getIterator(te.Wrap);let c=u.getNext();for(;c;)c.name!==e.name&&l.push(c),c=u.getNext();return l.push(e),oc(l,o.getCompare())}else return Wi;else{const l=n.get(e.name);let u=i;return l&&(u=u.remove(new te(e.name,l))),u.insert(e,e.node)}});return new Kn(r,this.indexSet_)}removeFromIndexes(e,n){const r=Yu(this.indexes_,i=>{if(i===Wi)return i;{const s=n.get(e.name);return s?i.remove(new te(e.name,s)):i}});return new Kn(r,this.indexSet_)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ko;class K{constructor(e,n,r){this.children_=e,this.priorityNode_=n,this.indexMap_=r,this.lazyHash_=null,this.priorityNode_&&pS(this.priorityNode_),this.children_.isEmpty()&&U(!this.priorityNode_||this.priorityNode_.isEmpty(),"An empty node cannot have a priority")}static get EMPTY_NODE(){return ko||(ko=new K(new En(Um),null,Kn.Default))}isLeafNode(){return!1}getPriority(){return this.priorityNode_||ko}updatePriority(e){return this.children_.isEmpty()?this:new K(this.children_,e,this.indexMap_)}getImmediateChild(e){if(e===".priority")return this.getPriority();{const n=this.children_.get(e);return n===null?ko:n}}getChild(e){const n=se(e);return n===null?this:this.getImmediateChild(n).getChild(we(e))}hasChild(e){return this.children_.get(e)!==null}updateImmediateChild(e,n){if(U(n,"We should always be passing snapshot nodes"),e===".priority")return this.updatePriority(n);{const r=new te(e,n);let i,s;n.isEmpty()?(i=this.children_.remove(e),s=this.indexMap_.removeFromIndexes(r,this.children_)):(i=this.children_.insert(e,n),s=this.indexMap_.addToIndexes(r,this.children_));const o=i.isEmpty()?ko:this.priorityNode_;return new K(i,o,s)}}updateChild(e,n){const r=se(e);if(r===null)return n;{U(se(e)!==".priority"||Wr(e)===1,".priority must be the last token in a path");const i=this.getImmediateChild(r).updateChild(we(e),n);return this.updateImmediateChild(r,i)}}isEmpty(){return this.children_.isEmpty()}numChildren(){return this.children_.count()}val(e){if(this.isEmpty())return null;const n={};let r=0,i=0,s=!0;if(this.forEachChild(Oe,(o,l)=>{n[o]=l.val(e),r++,s&&K.INTEGER_REGEXP_.test(o)?i=Math.max(i,Number(o)):s=!1}),!e&&s&&i<2*r){const o=[];for(const l in n)o[l]=n[l];return o}else return e&&!this.getPriority().isEmpty()&&(n[".priority"]=this.getPriority().val()),n}hash(){if(this.lazyHash_===null){let e="";this.getPriority().isEmpty()||(e+="priority:"+fS(this.getPriority().val())+":"),this.forEachChild(Oe,(n,r)=>{const i=r.hash();i!==""&&(e+=":"+n+":"+i)}),this.lazyHash_=e===""?"":jI(e)}return this.lazyHash_}getPredecessorChildName(e,n,r){const i=this.resolveIndex_(r);if(i){const s=i.getPredecessorKey(new te(e,n));return s?s.name:null}else return this.children_.getPredecessorKey(e)}getFirstChildName(e){const n=this.resolveIndex_(e);if(n){const r=n.minKey();return r&&r.name}else return this.children_.minKey()}getFirstChild(e){const n=this.getFirstChildName(e);return n?new te(n,this.children_.get(n)):null}getLastChildName(e){const n=this.resolveIndex_(e);if(n){const r=n.maxKey();return r&&r.name}else return this.children_.maxKey()}getLastChild(e){const n=this.getLastChildName(e);return n?new te(n,this.children_.get(n)):null}forEachChild(e,n){const r=this.resolveIndex_(e);return r?r.inorderTraversal(i=>n(i.name,i.node)):this.children_.inorderTraversal(n)}getIterator(e){return this.getIteratorFrom(e.minPost(),e)}getIteratorFrom(e,n){const r=this.resolveIndex_(n);if(r)return r.getIteratorFrom(e,i=>i);{const i=this.children_.getIteratorFrom(e.name,te.Wrap);let s=i.peek();for(;s!=null&&n.compare(s,e)<0;)i.getNext(),s=i.peek();return i}}getReverseIterator(e){return this.getReverseIteratorFrom(e.maxPost(),e)}getReverseIteratorFrom(e,n){const r=this.resolveIndex_(n);if(r)return r.getReverseIteratorFrom(e,i=>i);{const i=this.children_.getReverseIteratorFrom(e.name,te.Wrap);let s=i.peek();for(;s!=null&&n.compare(s,e)>0;)i.getNext(),s=i.peek();return i}}compareTo(e){return this.isEmpty()?e.isEmpty()?0:-1:e.isLeafNode()||e.isEmpty()?1:e===rl?-1:0}withIndex(e){if(e===ys||this.indexMap_.hasIndex(e))return this;{const n=this.indexMap_.addIndex(e,this.children_);return new K(this.children_,this.priorityNode_,n)}}isIndexed(e){return e===ys||this.indexMap_.hasIndex(e)}equals(e){if(e===this)return!0;if(e.isLeafNode())return!1;{const n=e;if(this.getPriority().equals(n.getPriority()))if(this.children_.count()===n.children_.count()){const r=this.getIterator(Oe),i=n.getIterator(Oe);let s=r.getNext(),o=i.getNext();for(;s&&o;){if(s.name!==o.name||!s.node.equals(o.node))return!1;s=r.getNext(),o=i.getNext()}return s===null&&o===null}else return!1;else return!1}}resolveIndex_(e){return e===ys?null:this.indexMap_.get(e.toString())}}K.INTEGER_REGEXP_=/^(0|[1-9]\d*)$/;class hM extends K{constructor(){super(new En(Um),K.EMPTY_NODE,Kn.Default)}compareTo(e){return e===this?0:1}equals(e){return e===this}getPriority(){return this}getImmediateChild(e){return K.EMPTY_NODE}isEmpty(){return!1}}const rl=new hM;Object.defineProperties(te,{MIN:{value:new te(xs,K.EMPTY_NODE)},MAX:{value:new te(Ri,rl)}});dS.__EMPTY_NODE=K.EMPTY_NODE;Ge.__childrenNodeConstructor=K;sM(rl);aM(rl);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dM=!0;function Ye(t,e=null){if(t===null)return K.EMPTY_NODE;if(typeof t=="object"&&".priority"in t&&(e=t[".priority"]),U(e===null||typeof e=="string"||typeof e=="number"||typeof e=="object"&&".sv"in e,"Invalid priority type found: "+typeof e),typeof t=="object"&&".value"in t&&t[".value"]!==null&&(t=t[".value"]),typeof t!="object"||".sv"in t){const n=t;return new Ge(n,Ye(e))}if(!(t instanceof Array)&&dM){const n=[];let r=!1;if(Lt(t,(o,l)=>{if(o.substring(0,1)!=="."){const u=Ye(l);u.isEmpty()||(r=r||!u.getPriority().isEmpty(),n.push(new te(o,u)))}}),n.length===0)return K.EMPTY_NODE;const s=oc(n,iM,o=>o.name,Um);if(r){const o=oc(n,Oe.getCompare());return new K(s,Ye(e),new Kn({".priority":o},{".priority":Oe}))}else return new K(s,Ye(e),Kn.Default)}else{let n=K.EMPTY_NODE;return Lt(t,(r,i)=>{if(cr(t,r)&&r.substring(0,1)!=="."){const s=Ye(i);(s.isLeafNode()||!s.isEmpty())&&(n=n.updateImmediateChild(r,s))}}),n.updatePriority(Ye(e))}}oM(Ye);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fM extends eh{constructor(e){super(),this.indexPath_=e,U(!ne(e)&&se(e)!==".priority","Can't create PathIndex with empty path or .priority key")}extractChild(e){return e.getChild(this.indexPath_)}isDefinedOn(e){return!e.getChild(this.indexPath_).isEmpty()}compare(e,n){const r=this.extractChild(e.node),i=this.extractChild(n.node),s=r.compareTo(i);return s===0?Qs(e.name,n.name):s}makePost(e,n){const r=Ye(e),i=K.EMPTY_NODE.updateChild(this.indexPath_,r);return new te(n,i)}maxPost(){const e=K.EMPTY_NODE.updateChild(this.indexPath_,rl);return new te(Ri,e)}toString(){return lS(this.indexPath_,0).join("/")}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pM extends eh{compare(e,n){const r=e.node.compareTo(n.node);return r===0?Qs(e.name,n.name):r}isDefinedOn(e){return!0}indexedValueChanged(e,n){return!e.equals(n)}minPost(){return te.MIN}maxPost(){return te.MAX}makePost(e,n){const r=Ye(e);return new te(n,r)}toString(){return".value"}}const mM=new pM;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _S(t){return{type:"value",snapshotNode:t}}function bs(t,e){return{type:"child_added",snapshotNode:e,childName:t}}function Aa(t,e){return{type:"child_removed",snapshotNode:e,childName:t}}function Na(t,e,n){return{type:"child_changed",snapshotNode:e,childName:t,oldSnap:n}}function gM(t,e){return{type:"child_moved",snapshotNode:e,childName:t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $m{constructor(e){this.index_=e}updateChild(e,n,r,i,s,o){U(e.isIndexed(this.index_),"A node must be indexed if only a child is updated");const l=e.getImmediateChild(n);return l.getChild(i).equals(r.getChild(i))&&l.isEmpty()===r.isEmpty()||(o!=null&&(r.isEmpty()?e.hasChild(n)?o.trackChildChange(Aa(n,l)):U(e.isLeafNode(),"A child remove without an old child only makes sense on a leaf node"):l.isEmpty()?o.trackChildChange(bs(n,r)):o.trackChildChange(Na(n,r,l))),e.isLeafNode()&&r.isEmpty())?e:e.updateImmediateChild(n,r).withIndex(this.index_)}updateFullNode(e,n,r){return r!=null&&(e.isLeafNode()||e.forEachChild(Oe,(i,s)=>{n.hasChild(i)||r.trackChildChange(Aa(i,s))}),n.isLeafNode()||n.forEachChild(Oe,(i,s)=>{if(e.hasChild(i)){const o=e.getImmediateChild(i);o.equals(s)||r.trackChildChange(Na(i,s,o))}else r.trackChildChange(bs(i,s))})),n.withIndex(this.index_)}updatePriority(e,n){return e.isEmpty()?K.EMPTY_NODE:e.updatePriority(n)}filtersNodes(){return!1}getIndexedFilter(){return this}getIndex(){return this.index_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pa{constructor(e){this.indexedFilter_=new $m(e.getIndex()),this.index_=e.getIndex(),this.startPost_=Pa.getStartPost_(e),this.endPost_=Pa.getEndPost_(e),this.startIsInclusive_=!e.startAfterSet_,this.endIsInclusive_=!e.endBeforeSet_}getStartPost(){return this.startPost_}getEndPost(){return this.endPost_}matches(e){const n=this.startIsInclusive_?this.index_.compare(this.getStartPost(),e)<=0:this.index_.compare(this.getStartPost(),e)<0,r=this.endIsInclusive_?this.index_.compare(e,this.getEndPost())<=0:this.index_.compare(e,this.getEndPost())<0;return n&&r}updateChild(e,n,r,i,s,o){return this.matches(new te(n,r))||(r=K.EMPTY_NODE),this.indexedFilter_.updateChild(e,n,r,i,s,o)}updateFullNode(e,n,r){n.isLeafNode()&&(n=K.EMPTY_NODE);let i=n.withIndex(this.index_);i=i.updatePriority(K.EMPTY_NODE);const s=this;return n.forEachChild(Oe,(o,l)=>{s.matches(new te(o,l))||(i=i.updateImmediateChild(o,K.EMPTY_NODE))}),this.indexedFilter_.updateFullNode(e,i,r)}updatePriority(e,n){return e}filtersNodes(){return!0}getIndexedFilter(){return this.indexedFilter_}getIndex(){return this.index_}static getStartPost_(e){if(e.hasStart()){const n=e.getIndexStartName();return e.getIndex().makePost(e.getIndexStartValue(),n)}else return e.getIndex().minPost()}static getEndPost_(e){if(e.hasEnd()){const n=e.getIndexEndName();return e.getIndex().makePost(e.getIndexEndValue(),n)}else return e.getIndex().maxPost()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _M{constructor(e){this.withinDirectionalStart=n=>this.reverse_?this.withinEndPost(n):this.withinStartPost(n),this.withinDirectionalEnd=n=>this.reverse_?this.withinStartPost(n):this.withinEndPost(n),this.withinStartPost=n=>{const r=this.index_.compare(this.rangedFilter_.getStartPost(),n);return this.startIsInclusive_?r<=0:r<0},this.withinEndPost=n=>{const r=this.index_.compare(n,this.rangedFilter_.getEndPost());return this.endIsInclusive_?r<=0:r<0},this.rangedFilter_=new Pa(e),this.index_=e.getIndex(),this.limit_=e.getLimit(),this.reverse_=!e.isViewFromLeft(),this.startIsInclusive_=!e.startAfterSet_,this.endIsInclusive_=!e.endBeforeSet_}updateChild(e,n,r,i,s,o){return this.rangedFilter_.matches(new te(n,r))||(r=K.EMPTY_NODE),e.getImmediateChild(n).equals(r)?e:e.numChildren()<this.limit_?this.rangedFilter_.getIndexedFilter().updateChild(e,n,r,i,s,o):this.fullLimitUpdateChild_(e,n,r,s,o)}updateFullNode(e,n,r){let i;if(n.isLeafNode()||n.isEmpty())i=K.EMPTY_NODE.withIndex(this.index_);else if(this.limit_*2<n.numChildren()&&n.isIndexed(this.index_)){i=K.EMPTY_NODE.withIndex(this.index_);let s;this.reverse_?s=n.getReverseIteratorFrom(this.rangedFilter_.getEndPost(),this.index_):s=n.getIteratorFrom(this.rangedFilter_.getStartPost(),this.index_);let o=0;for(;s.hasNext()&&o<this.limit_;){const l=s.getNext();if(this.withinDirectionalStart(l))if(this.withinDirectionalEnd(l))i=i.updateImmediateChild(l.name,l.node),o++;else break;else continue}}else{i=n.withIndex(this.index_),i=i.updatePriority(K.EMPTY_NODE);let s;this.reverse_?s=i.getReverseIterator(this.index_):s=i.getIterator(this.index_);let o=0;for(;s.hasNext();){const l=s.getNext();o<this.limit_&&this.withinDirectionalStart(l)&&this.withinDirectionalEnd(l)?o++:i=i.updateImmediateChild(l.name,K.EMPTY_NODE)}}return this.rangedFilter_.getIndexedFilter().updateFullNode(e,i,r)}updatePriority(e,n){return e}filtersNodes(){return!0}getIndexedFilter(){return this.rangedFilter_.getIndexedFilter()}getIndex(){return this.index_}fullLimitUpdateChild_(e,n,r,i,s){let o;if(this.reverse_){const p=this.index_.getCompare();o=(m,E)=>p(E,m)}else o=this.index_.getCompare();const l=e;U(l.numChildren()===this.limit_,"");const u=new te(n,r),c=this.reverse_?l.getFirstChild(this.index_):l.getLastChild(this.index_),d=this.rangedFilter_.matches(u);if(l.hasChild(n)){const p=l.getImmediateChild(n);let m=i.getChildAfterChild(this.index_,c,this.reverse_);for(;m!=null&&(m.name===n||l.hasChild(m.name));)m=i.getChildAfterChild(this.index_,m,this.reverse_);const E=m==null?1:o(m,u);if(d&&!r.isEmpty()&&E>=0)return s!=null&&s.trackChildChange(Na(n,r,p)),l.updateImmediateChild(n,r);{s!=null&&s.trackChildChange(Aa(n,p));const x=l.updateImmediateChild(n,K.EMPTY_NODE);return m!=null&&this.rangedFilter_.matches(m)?(s!=null&&s.trackChildChange(bs(m.name,m.node)),x.updateImmediateChild(m.name,m.node)):x}}else return r.isEmpty()?e:d&&o(c,u)>=0?(s!=null&&(s.trackChildChange(Aa(c.name,c.node)),s.trackChildChange(bs(n,r))),l.updateImmediateChild(n,r).updateImmediateChild(c.name,K.EMPTY_NODE)):e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bm{constructor(){this.limitSet_=!1,this.startSet_=!1,this.startNameSet_=!1,this.startAfterSet_=!1,this.endSet_=!1,this.endNameSet_=!1,this.endBeforeSet_=!1,this.limit_=0,this.viewFrom_="",this.indexStartValue_=null,this.indexStartName_="",this.indexEndValue_=null,this.indexEndName_="",this.index_=Oe}hasStart(){return this.startSet_}isViewFromLeft(){return this.viewFrom_===""?this.startSet_:this.viewFrom_==="l"}getIndexStartValue(){return U(this.startSet_,"Only valid if start has been set"),this.indexStartValue_}getIndexStartName(){return U(this.startSet_,"Only valid if start has been set"),this.startNameSet_?this.indexStartName_:xs}hasEnd(){return this.endSet_}getIndexEndValue(){return U(this.endSet_,"Only valid if end has been set"),this.indexEndValue_}getIndexEndName(){return U(this.endSet_,"Only valid if end has been set"),this.endNameSet_?this.indexEndName_:Ri}hasLimit(){return this.limitSet_}hasAnchoredLimit(){return this.limitSet_&&this.viewFrom_!==""}getLimit(){return U(this.limitSet_,"Only valid if limit has been set"),this.limit_}getIndex(){return this.index_}loadsAllData(){return!(this.startSet_||this.endSet_||this.limitSet_)}isDefault(){return this.loadsAllData()&&this.index_===Oe}copy(){const e=new Bm;return e.limitSet_=this.limitSet_,e.limit_=this.limit_,e.startSet_=this.startSet_,e.startAfterSet_=this.startAfterSet_,e.indexStartValue_=this.indexStartValue_,e.startNameSet_=this.startNameSet_,e.indexStartName_=this.indexStartName_,e.endSet_=this.endSet_,e.endBeforeSet_=this.endBeforeSet_,e.indexEndValue_=this.indexEndValue_,e.endNameSet_=this.endNameSet_,e.indexEndName_=this.indexEndName_,e.index_=this.index_,e.viewFrom_=this.viewFrom_,e}}function yM(t){return t.loadsAllData()?new $m(t.getIndex()):t.hasLimit()?new _M(t):new Pa(t)}function Kv(t){const e={};if(t.isDefault())return e;let n;if(t.index_===Oe?n="$priority":t.index_===mM?n="$value":t.index_===ys?n="$key":(U(t.index_ instanceof fM,"Unrecognized index type!"),n=t.index_.toString()),e.orderBy=Be(n),t.startSet_){const r=t.startAfterSet_?"startAfter":"startAt";e[r]=Be(t.indexStartValue_),t.startNameSet_&&(e[r]+=","+Be(t.indexStartName_))}if(t.endSet_){const r=t.endBeforeSet_?"endBefore":"endAt";e[r]=Be(t.indexEndValue_),t.endNameSet_&&(e[r]+=","+Be(t.indexEndName_))}return t.limitSet_&&(t.isViewFromLeft()?e.limitToFirst=t.limit_:e.limitToLast=t.limit_),e}function Qv(t){const e={};if(t.startSet_&&(e.sp=t.indexStartValue_,t.startNameSet_&&(e.sn=t.indexStartName_),e.sin=!t.startAfterSet_),t.endSet_&&(e.ep=t.indexEndValue_,t.endNameSet_&&(e.en=t.indexEndName_),e.ein=!t.endBeforeSet_),t.limitSet_){e.l=t.limit_;let n=t.viewFrom_;n===""&&(t.isViewFromLeft()?n="l":n="r"),e.vf=n}return t.index_!==Oe&&(e.i=t.index_.toString()),e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ac extends sS{constructor(e,n,r,i){super(),this.repoInfo_=e,this.onDataUpdate_=n,this.authTokenProvider_=r,this.appCheckTokenProvider_=i,this.log_=nl("p:rest:"),this.listens_={}}reportStats(e){throw new Error("Method not implemented.")}static getListenId_(e,n){return n!==void 0?"tag$"+n:(U(e._queryParams.isDefault(),"should have a tag if it's not a default query."),e._path.toString())}listen(e,n,r,i){const s=e._path.toString();this.log_("Listen called for "+s+" "+e._queryIdentifier);const o=ac.getListenId_(e,r),l={};this.listens_[o]=l;const u=Kv(e._queryParams);this.restRequest_(s+".json",u,(c,d)=>{let p=d;if(c===404&&(p=null,c=null),c===null&&this.onDataUpdate_(s,p,!1,r),Ns(this.listens_,o)===l){let m;c?c===401?m="permission_denied":m="rest_error:"+c:m="ok",i(m,null)}})}unlisten(e,n){const r=ac.getListenId_(e,n);delete this.listens_[r]}get(e){const n=Kv(e._queryParams),r=e._path.toString(),i=new Gc;return this.restRequest_(r+".json",n,(s,o)=>{let l=o;s===404&&(l=null,s=null),s===null?(this.onDataUpdate_(r,l,!1,null),i.resolve(l)):i.reject(new Error(l))}),i.promise}refreshAuthToken(e){}restRequest_(e,n={},r){return n.format="export",Promise.all([this.authTokenProvider_.getToken(!1),this.appCheckTokenProvider_.getToken(!1)]).then(([i,s])=>{i&&i.accessToken&&(n.auth=i.accessToken),s&&s.token&&(n.ac=s.token);const o=(this.repoInfo_.secure?"https://":"http://")+this.repoInfo_.host+e+"?ns="+this.repoInfo_.namespace+Gs(n);this.log_("Sending REST request for "+o);const l=new XMLHttpRequest;l.onreadystatechange=()=>{if(r&&l.readyState===4){this.log_("REST Response for "+o+" received. status:",l.status,"response:",l.responseText);let u=null;if(l.status>=200&&l.status<300){try{u=Sa(l.responseText)}catch{Ot("Failed to parse JSON response for "+o+": "+l.responseText)}r(null,u)}else l.status!==401&&l.status!==404&&Ot("Got unsuccessful REST response for "+o+" Status: "+l.status),r(l.status);r=null}},l.open("GET",o,!0),l.send()})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vM{constructor(){this.rootNode_=K.EMPTY_NODE}getNode(e){return this.rootNode_.getChild(e)}updateSnapshot(e,n){this.rootNode_=this.rootNode_.updateChild(e,n)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lc(){return{value:null,children:new Map}}function yS(t,e,n){if(ne(e))t.value=n,t.children.clear();else if(t.value!==null)t.value=t.value.updateChild(e,n);else{const r=se(e);t.children.has(r)||t.children.set(r,lc());const i=t.children.get(r);e=we(e),yS(i,e,n)}}function qf(t,e,n){t.value!==null?n(e,t.value):wM(t,(r,i)=>{const s=new ye(e.toString()+"/"+r);qf(i,s,n)})}function wM(t,e){t.children.forEach((n,r)=>{e(r,n)})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class EM{constructor(e){this.collection_=e,this.last_=null}get(){const e=this.collection_.get(),n=Object.assign({},e);return this.last_&&Lt(this.last_,(r,i)=>{n[r]=n[r]-i}),this.last_=e,n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yv=10*1e3,TM=30*1e3,IM=5*60*1e3;class SM{constructor(e,n){this.server_=n,this.statsToReport_={},this.statsListener_=new EM(e);const r=Yv+(TM-Yv)*Math.random();Qo(this.reportStats_.bind(this),Math.floor(r))}reportStats_(){const e=this.statsListener_.get(),n={};let r=!1;Lt(e,(i,s)=>{s>0&&cr(this.statsToReport_,i)&&(n[i]=s,r=!0)}),r&&this.server_.reportStats(n),Qo(this.reportStats_.bind(this),Math.floor(Math.random()*2*IM))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ln;(function(t){t[t.OVERWRITE=0]="OVERWRITE",t[t.MERGE=1]="MERGE",t[t.ACK_USER_WRITE=2]="ACK_USER_WRITE",t[t.LISTEN_COMPLETE=3]="LISTEN_COMPLETE"})(ln||(ln={}));function vS(){return{fromUser:!0,fromServer:!1,queryId:null,tagged:!1}}function zm(){return{fromUser:!1,fromServer:!0,queryId:null,tagged:!1}}function Wm(t){return{fromUser:!1,fromServer:!0,queryId:t,tagged:!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uc{constructor(e,n,r){this.path=e,this.affectedTree=n,this.revert=r,this.type=ln.ACK_USER_WRITE,this.source=vS()}operationForChild(e){if(ne(this.path)){if(this.affectedTree.value!=null)return U(this.affectedTree.children.isEmpty(),"affectedTree should not have overlapping affected paths."),this;{const n=this.affectedTree.subtree(new ye(e));return new uc(de(),n,this.revert)}}else return U(se(this.path)===e,"operationForChild called for unrelated child."),new uc(we(this.path),this.affectedTree,this.revert)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xa{constructor(e,n){this.source=e,this.path=n,this.type=ln.LISTEN_COMPLETE}operationForChild(e){return ne(this.path)?new xa(this.source,de()):new xa(this.source,we(this.path))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ai{constructor(e,n,r){this.source=e,this.path=n,this.snap=r,this.type=ln.OVERWRITE}operationForChild(e){return ne(this.path)?new Ai(this.source,de(),this.snap.getImmediateChild(e)):new Ai(this.source,we(this.path),this.snap)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ba{constructor(e,n,r){this.source=e,this.path=n,this.children=r,this.type=ln.MERGE}operationForChild(e){if(ne(this.path)){const n=this.children.subtree(new ye(e));return n.isEmpty()?null:n.value?new Ai(this.source,de(),n.value):new ba(this.source,de(),n)}else return U(se(this.path)===e,"Can't get a merge for a child not on the path of the operation"),new ba(this.source,we(this.path),this.children)}toString(){return"Operation("+this.path+": "+this.source.toString()+" merge: "+this.children.toString()+")"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hr{constructor(e,n,r){this.node_=e,this.fullyInitialized_=n,this.filtered_=r}isFullyInitialized(){return this.fullyInitialized_}isFiltered(){return this.filtered_}isCompleteForPath(e){if(ne(e))return this.isFullyInitialized()&&!this.filtered_;const n=se(e);return this.isCompleteForChild(n)}isCompleteForChild(e){return this.isFullyInitialized()&&!this.filtered_||this.node_.hasChild(e)}getNode(){return this.node_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class CM{constructor(e){this.query_=e,this.index_=this.query_._queryParams.getIndex()}}function kM(t,e,n,r){const i=[],s=[];return e.forEach(o=>{o.type==="child_changed"&&t.index_.indexedValueChanged(o.oldSnap,o.snapshotNode)&&s.push(gM(o.childName,o.snapshotNode))}),Ro(t,i,"child_removed",e,r,n),Ro(t,i,"child_added",e,r,n),Ro(t,i,"child_moved",s,r,n),Ro(t,i,"child_changed",e,r,n),Ro(t,i,"value",e,r,n),i}function Ro(t,e,n,r,i,s){const o=r.filter(l=>l.type===n);o.sort((l,u)=>AM(t,l,u)),o.forEach(l=>{const u=RM(t,l,s);i.forEach(c=>{c.respondsTo(l.type)&&e.push(c.createEvent(u,t.query_))})})}function RM(t,e,n){return e.type==="value"||e.type==="child_removed"||(e.prevName=n.getPredecessorChildName(e.childName,e.snapshotNode,t.index_)),e}function AM(t,e,n){if(e.childName==null||n.childName==null)throw qs("Should only compare child_ events.");const r=new te(e.childName,e.snapshotNode),i=new te(n.childName,n.snapshotNode);return t.index_.compare(r,i)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function th(t,e){return{eventCache:t,serverCache:e}}function Yo(t,e,n,r){return th(new Hr(e,n,r),t.serverCache)}function wS(t,e,n,r){return th(t.eventCache,new Hr(e,n,r))}function cc(t){return t.eventCache.isFullyInitialized()?t.eventCache.getNode():null}function Ni(t){return t.serverCache.isFullyInitialized()?t.serverCache.getNode():null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let kd;const NM=()=>(kd||(kd=new En(pD)),kd);class Se{constructor(e,n=NM()){this.value=e,this.children=n}static fromObject(e){let n=new Se(null);return Lt(e,(r,i)=>{n=n.set(new ye(r),i)}),n}isEmpty(){return this.value===null&&this.children.isEmpty()}findRootMostMatchingPathAndValue(e,n){if(this.value!=null&&n(this.value))return{path:de(),value:this.value};if(ne(e))return null;{const r=se(e),i=this.children.get(r);if(i!==null){const s=i.findRootMostMatchingPathAndValue(we(e),n);return s!=null?{path:ze(new ye(r),s.path),value:s.value}:null}else return null}}findRootMostValueAndPath(e){return this.findRootMostMatchingPathAndValue(e,()=>!0)}subtree(e){if(ne(e))return this;{const n=se(e),r=this.children.get(n);return r!==null?r.subtree(we(e)):new Se(null)}}set(e,n){if(ne(e))return new Se(n,this.children);{const r=se(e),s=(this.children.get(r)||new Se(null)).set(we(e),n),o=this.children.insert(r,s);return new Se(this.value,o)}}remove(e){if(ne(e))return this.children.isEmpty()?new Se(null):new Se(null,this.children);{const n=se(e),r=this.children.get(n);if(r){const i=r.remove(we(e));let s;return i.isEmpty()?s=this.children.remove(n):s=this.children.insert(n,i),this.value===null&&s.isEmpty()?new Se(null):new Se(this.value,s)}else return this}}get(e){if(ne(e))return this.value;{const n=se(e),r=this.children.get(n);return r?r.get(we(e)):null}}setTree(e,n){if(ne(e))return n;{const r=se(e),s=(this.children.get(r)||new Se(null)).setTree(we(e),n);let o;return s.isEmpty()?o=this.children.remove(r):o=this.children.insert(r,s),new Se(this.value,o)}}fold(e){return this.fold_(de(),e)}fold_(e,n){const r={};return this.children.inorderTraversal((i,s)=>{r[i]=s.fold_(ze(e,i),n)}),n(e,this.value,r)}findOnPath(e,n){return this.findOnPath_(e,de(),n)}findOnPath_(e,n,r){const i=this.value?r(n,this.value):!1;if(i)return i;if(ne(e))return null;{const s=se(e),o=this.children.get(s);return o?o.findOnPath_(we(e),ze(n,s),r):null}}foreachOnPath(e,n){return this.foreachOnPath_(e,de(),n)}foreachOnPath_(e,n,r){if(ne(e))return this;{this.value&&r(n,this.value);const i=se(e),s=this.children.get(i);return s?s.foreachOnPath_(we(e),ze(n,i),r):new Se(null)}}foreach(e){this.foreach_(de(),e)}foreach_(e,n){this.children.inorderTraversal((r,i)=>{i.foreach_(ze(e,r),n)}),this.value&&n(e,this.value)}foreachChild(e){this.children.inorderTraversal((n,r)=>{r.value&&e(n,r.value)})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fn{constructor(e){this.writeTree_=e}static empty(){return new fn(new Se(null))}}function Xo(t,e,n){if(ne(e))return new fn(new Se(n));{const r=t.writeTree_.findRootMostValueAndPath(e);if(r!=null){const i=r.path;let s=r.value;const o=St(i,e);return s=s.updateChild(o,n),new fn(t.writeTree_.set(i,s))}else{const i=new Se(n),s=t.writeTree_.setTree(e,i);return new fn(s)}}}function Xv(t,e,n){let r=t;return Lt(n,(i,s)=>{r=Xo(r,ze(e,i),s)}),r}function Jv(t,e){if(ne(e))return fn.empty();{const n=t.writeTree_.setTree(e,new Se(null));return new fn(n)}}function Gf(t,e){return Li(t,e)!=null}function Li(t,e){const n=t.writeTree_.findRootMostValueAndPath(e);return n!=null?t.writeTree_.get(n.path).getChild(St(n.path,e)):null}function Zv(t){const e=[],n=t.writeTree_.value;return n!=null?n.isLeafNode()||n.forEachChild(Oe,(r,i)=>{e.push(new te(r,i))}):t.writeTree_.children.inorderTraversal((r,i)=>{i.value!=null&&e.push(new te(r,i.value))}),e}function Fr(t,e){if(ne(e))return t;{const n=Li(t,e);return n!=null?new fn(new Se(n)):new fn(t.writeTree_.subtree(e))}}function Kf(t){return t.writeTree_.isEmpty()}function Ds(t,e){return ES(de(),t.writeTree_,e)}function ES(t,e,n){if(e.value!=null)return n.updateChild(t,e.value);{let r=null;return e.children.inorderTraversal((i,s)=>{i===".priority"?(U(s.value!==null,"Priority writes must always be leaf nodes"),r=s.value):n=ES(ze(t,i),s,n)}),!n.getChild(t).isEmpty()&&r!==null&&(n=n.updateChild(ze(t,".priority"),r)),n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nh(t,e){return CS(e,t)}function PM(t,e,n,r,i){U(r>t.lastWriteId,"Stacking an older write on top of newer ones"),i===void 0&&(i=!0),t.allWrites.push({path:e,snap:n,writeId:r,visible:i}),i&&(t.visibleWrites=Xo(t.visibleWrites,e,n)),t.lastWriteId=r}function xM(t,e){for(let n=0;n<t.allWrites.length;n++){const r=t.allWrites[n];if(r.writeId===e)return r}return null}function bM(t,e){const n=t.allWrites.findIndex(l=>l.writeId===e);U(n>=0,"removeWrite called with nonexistent writeId.");const r=t.allWrites[n];t.allWrites.splice(n,1);let i=r.visible,s=!1,o=t.allWrites.length-1;for(;i&&o>=0;){const l=t.allWrites[o];l.visible&&(o>=n&&DM(l,r.path)?i=!1:an(r.path,l.path)&&(s=!0)),o--}if(i){if(s)return MM(t),!0;if(r.snap)t.visibleWrites=Jv(t.visibleWrites,r.path);else{const l=r.children;Lt(l,u=>{t.visibleWrites=Jv(t.visibleWrites,ze(r.path,u))})}return!0}else return!1}function DM(t,e){if(t.snap)return an(t.path,e);for(const n in t.children)if(t.children.hasOwnProperty(n)&&an(ze(t.path,n),e))return!0;return!1}function MM(t){t.visibleWrites=TS(t.allWrites,OM,de()),t.allWrites.length>0?t.lastWriteId=t.allWrites[t.allWrites.length-1].writeId:t.lastWriteId=-1}function OM(t){return t.visible}function TS(t,e,n){let r=fn.empty();for(let i=0;i<t.length;++i){const s=t[i];if(e(s)){const o=s.path;let l;if(s.snap)an(n,o)?(l=St(n,o),r=Xo(r,l,s.snap)):an(o,n)&&(l=St(o,n),r=Xo(r,de(),s.snap.getChild(l)));else if(s.children){if(an(n,o))l=St(n,o),r=Xv(r,l,s.children);else if(an(o,n))if(l=St(o,n),ne(l))r=Xv(r,de(),s.children);else{const u=Ns(s.children,se(l));if(u){const c=u.getChild(we(l));r=Xo(r,de(),c)}}}else throw qs("WriteRecord should have .snap or .children")}}return r}function IS(t,e,n,r,i){if(!r&&!i){const s=Li(t.visibleWrites,e);if(s!=null)return s;{const o=Fr(t.visibleWrites,e);if(Kf(o))return n;if(n==null&&!Gf(o,de()))return null;{const l=n||K.EMPTY_NODE;return Ds(o,l)}}}else{const s=Fr(t.visibleWrites,e);if(!i&&Kf(s))return n;if(!i&&n==null&&!Gf(s,de()))return null;{const o=function(c){return(c.visible||i)&&(!r||!~r.indexOf(c.writeId))&&(an(c.path,e)||an(e,c.path))},l=TS(t.allWrites,o,e),u=n||K.EMPTY_NODE;return Ds(l,u)}}}function LM(t,e,n){let r=K.EMPTY_NODE;const i=Li(t.visibleWrites,e);if(i)return i.isLeafNode()||i.forEachChild(Oe,(s,o)=>{r=r.updateImmediateChild(s,o)}),r;if(n){const s=Fr(t.visibleWrites,e);return n.forEachChild(Oe,(o,l)=>{const u=Ds(Fr(s,new ye(o)),l);r=r.updateImmediateChild(o,u)}),Zv(s).forEach(o=>{r=r.updateImmediateChild(o.name,o.node)}),r}else{const s=Fr(t.visibleWrites,e);return Zv(s).forEach(o=>{r=r.updateImmediateChild(o.name,o.node)}),r}}function VM(t,e,n,r,i){U(r||i,"Either existingEventSnap or existingServerSnap must exist");const s=ze(e,n);if(Gf(t.visibleWrites,s))return null;{const o=Fr(t.visibleWrites,s);return Kf(o)?i.getChild(n):Ds(o,i.getChild(n))}}function FM(t,e,n,r){const i=ze(e,n),s=Li(t.visibleWrites,i);if(s!=null)return s;if(r.isCompleteForChild(n)){const o=Fr(t.visibleWrites,i);return Ds(o,r.getNode().getImmediateChild(n))}else return null}function jM(t,e){return Li(t.visibleWrites,e)}function UM(t,e,n,r,i,s,o){let l;const u=Fr(t.visibleWrites,e),c=Li(u,de());if(c!=null)l=c;else if(n!=null)l=Ds(u,n);else return[];if(l=l.withIndex(o),!l.isEmpty()&&!l.isLeafNode()){const d=[],p=o.getCompare(),m=s?l.getReverseIteratorFrom(r,o):l.getIteratorFrom(r,o);let E=m.getNext();for(;E&&d.length<i;)p(E,r)!==0&&d.push(E),E=m.getNext();return d}else return[]}function $M(){return{visibleWrites:fn.empty(),allWrites:[],lastWriteId:-1}}function hc(t,e,n,r){return IS(t.writeTree,t.treePath,e,n,r)}function Hm(t,e){return LM(t.writeTree,t.treePath,e)}function ew(t,e,n,r){return VM(t.writeTree,t.treePath,e,n,r)}function dc(t,e){return jM(t.writeTree,ze(t.treePath,e))}function BM(t,e,n,r,i,s){return UM(t.writeTree,t.treePath,e,n,r,i,s)}function qm(t,e,n){return FM(t.writeTree,t.treePath,e,n)}function SS(t,e){return CS(ze(t.treePath,e),t.writeTree)}function CS(t,e){return{treePath:t,writeTree:e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zM{constructor(){this.changeMap=new Map}trackChildChange(e){const n=e.type,r=e.childName;U(n==="child_added"||n==="child_changed"||n==="child_removed","Only child changes supported for tracking"),U(r!==".priority","Only non-priority child changes can be tracked.");const i=this.changeMap.get(r);if(i){const s=i.type;if(n==="child_added"&&s==="child_removed")this.changeMap.set(r,Na(r,e.snapshotNode,i.snapshotNode));else if(n==="child_removed"&&s==="child_added")this.changeMap.delete(r);else if(n==="child_removed"&&s==="child_changed")this.changeMap.set(r,Aa(r,i.oldSnap));else if(n==="child_changed"&&s==="child_added")this.changeMap.set(r,bs(r,e.snapshotNode));else if(n==="child_changed"&&s==="child_changed")this.changeMap.set(r,Na(r,e.snapshotNode,i.oldSnap));else throw qs("Illegal combination of changes: "+e+" occurred after "+i)}else this.changeMap.set(r,e)}getChanges(){return Array.from(this.changeMap.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class WM{getCompleteChild(e){return null}getChildAfterChild(e,n,r){return null}}const kS=new WM;class Gm{constructor(e,n,r=null){this.writes_=e,this.viewCache_=n,this.optCompleteServerCache_=r}getCompleteChild(e){const n=this.viewCache_.eventCache;if(n.isCompleteForChild(e))return n.getNode().getImmediateChild(e);{const r=this.optCompleteServerCache_!=null?new Hr(this.optCompleteServerCache_,!0,!1):this.viewCache_.serverCache;return qm(this.writes_,e,r)}}getChildAfterChild(e,n,r){const i=this.optCompleteServerCache_!=null?this.optCompleteServerCache_:Ni(this.viewCache_),s=BM(this.writes_,i,n,1,r,e);return s.length===0?null:s[0]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function HM(t){return{filter:t}}function qM(t,e){U(e.eventCache.getNode().isIndexed(t.filter.getIndex()),"Event snap not indexed"),U(e.serverCache.getNode().isIndexed(t.filter.getIndex()),"Server snap not indexed")}function GM(t,e,n,r,i){const s=new zM;let o,l;if(n.type===ln.OVERWRITE){const c=n;c.source.fromUser?o=Qf(t,e,c.path,c.snap,r,i,s):(U(c.source.fromServer,"Unknown source."),l=c.source.tagged||e.serverCache.isFiltered()&&!ne(c.path),o=fc(t,e,c.path,c.snap,r,i,l,s))}else if(n.type===ln.MERGE){const c=n;c.source.fromUser?o=QM(t,e,c.path,c.children,r,i,s):(U(c.source.fromServer,"Unknown source."),l=c.source.tagged||e.serverCache.isFiltered(),o=Yf(t,e,c.path,c.children,r,i,l,s))}else if(n.type===ln.ACK_USER_WRITE){const c=n;c.revert?o=JM(t,e,c.path,r,i,s):o=YM(t,e,c.path,c.affectedTree,r,i,s)}else if(n.type===ln.LISTEN_COMPLETE)o=XM(t,e,n.path,r,s);else throw qs("Unknown operation type: "+n.type);const u=s.getChanges();return KM(e,o,u),{viewCache:o,changes:u}}function KM(t,e,n){const r=e.eventCache;if(r.isFullyInitialized()){const i=r.getNode().isLeafNode()||r.getNode().isEmpty(),s=cc(t);(n.length>0||!t.eventCache.isFullyInitialized()||i&&!r.getNode().equals(s)||!r.getNode().getPriority().equals(s.getPriority()))&&n.push(_S(cc(e)))}}function RS(t,e,n,r,i,s){const o=e.eventCache;if(dc(r,n)!=null)return e;{let l,u;if(ne(n))if(U(e.serverCache.isFullyInitialized(),"If change path is empty, we must have complete server data"),e.serverCache.isFiltered()){const c=Ni(e),d=c instanceof K?c:K.EMPTY_NODE,p=Hm(r,d);l=t.filter.updateFullNode(e.eventCache.getNode(),p,s)}else{const c=hc(r,Ni(e));l=t.filter.updateFullNode(e.eventCache.getNode(),c,s)}else{const c=se(n);if(c===".priority"){U(Wr(n)===1,"Can't have a priority with additional path components");const d=o.getNode();u=e.serverCache.getNode();const p=ew(r,n,d,u);p!=null?l=t.filter.updatePriority(d,p):l=o.getNode()}else{const d=we(n);let p;if(o.isCompleteForChild(c)){u=e.serverCache.getNode();const m=ew(r,n,o.getNode(),u);m!=null?p=o.getNode().getImmediateChild(c).updateChild(d,m):p=o.getNode().getImmediateChild(c)}else p=qm(r,c,e.serverCache);p!=null?l=t.filter.updateChild(o.getNode(),c,p,d,i,s):l=o.getNode()}}return Yo(e,l,o.isFullyInitialized()||ne(n),t.filter.filtersNodes())}}function fc(t,e,n,r,i,s,o,l){const u=e.serverCache;let c;const d=o?t.filter:t.filter.getIndexedFilter();if(ne(n))c=d.updateFullNode(u.getNode(),r,null);else if(d.filtersNodes()&&!u.isFiltered()){const E=u.getNode().updateChild(n,r);c=d.updateFullNode(u.getNode(),E,null)}else{const E=se(n);if(!u.isCompleteForPath(n)&&Wr(n)>1)return e;const k=we(n),P=u.getNode().getImmediateChild(E).updateChild(k,r);E===".priority"?c=d.updatePriority(u.getNode(),P):c=d.updateChild(u.getNode(),E,P,k,kS,null)}const p=wS(e,c,u.isFullyInitialized()||ne(n),d.filtersNodes()),m=new Gm(i,p,s);return RS(t,p,n,i,m,l)}function Qf(t,e,n,r,i,s,o){const l=e.eventCache;let u,c;const d=new Gm(i,e,s);if(ne(n))c=t.filter.updateFullNode(e.eventCache.getNode(),r,o),u=Yo(e,c,!0,t.filter.filtersNodes());else{const p=se(n);if(p===".priority")c=t.filter.updatePriority(e.eventCache.getNode(),r),u=Yo(e,c,l.isFullyInitialized(),l.isFiltered());else{const m=we(n),E=l.getNode().getImmediateChild(p);let k;if(ne(m))k=r;else{const x=d.getCompleteChild(p);x!=null?aS(m)===".priority"&&x.getChild(uS(m)).isEmpty()?k=x:k=x.updateChild(m,r):k=K.EMPTY_NODE}if(E.equals(k))u=e;else{const x=t.filter.updateChild(l.getNode(),p,k,m,d,o);u=Yo(e,x,l.isFullyInitialized(),t.filter.filtersNodes())}}}return u}function tw(t,e){return t.eventCache.isCompleteForChild(e)}function QM(t,e,n,r,i,s,o){let l=e;return r.foreach((u,c)=>{const d=ze(n,u);tw(e,se(d))&&(l=Qf(t,l,d,c,i,s,o))}),r.foreach((u,c)=>{const d=ze(n,u);tw(e,se(d))||(l=Qf(t,l,d,c,i,s,o))}),l}function nw(t,e,n){return n.foreach((r,i)=>{e=e.updateChild(r,i)}),e}function Yf(t,e,n,r,i,s,o,l){if(e.serverCache.getNode().isEmpty()&&!e.serverCache.isFullyInitialized())return e;let u=e,c;ne(n)?c=r:c=new Se(null).setTree(n,r);const d=e.serverCache.getNode();return c.children.inorderTraversal((p,m)=>{if(d.hasChild(p)){const E=e.serverCache.getNode().getImmediateChild(p),k=nw(t,E,m);u=fc(t,u,new ye(p),k,i,s,o,l)}}),c.children.inorderTraversal((p,m)=>{const E=!e.serverCache.isCompleteForChild(p)&&m.value===null;if(!d.hasChild(p)&&!E){const k=e.serverCache.getNode().getImmediateChild(p),x=nw(t,k,m);u=fc(t,u,new ye(p),x,i,s,o,l)}}),u}function YM(t,e,n,r,i,s,o){if(dc(i,n)!=null)return e;const l=e.serverCache.isFiltered(),u=e.serverCache;if(r.value!=null){if(ne(n)&&u.isFullyInitialized()||u.isCompleteForPath(n))return fc(t,e,n,u.getNode().getChild(n),i,s,l,o);if(ne(n)){let c=new Se(null);return u.getNode().forEachChild(ys,(d,p)=>{c=c.set(new ye(d),p)}),Yf(t,e,n,c,i,s,l,o)}else return e}else{let c=new Se(null);return r.foreach((d,p)=>{const m=ze(n,d);u.isCompleteForPath(m)&&(c=c.set(d,u.getNode().getChild(m)))}),Yf(t,e,n,c,i,s,l,o)}}function XM(t,e,n,r,i){const s=e.serverCache,o=wS(e,s.getNode(),s.isFullyInitialized()||ne(n),s.isFiltered());return RS(t,o,n,r,kS,i)}function JM(t,e,n,r,i,s){let o;if(dc(r,n)!=null)return e;{const l=new Gm(r,e,i),u=e.eventCache.getNode();let c;if(ne(n)||se(n)===".priority"){let d;if(e.serverCache.isFullyInitialized())d=hc(r,Ni(e));else{const p=e.serverCache.getNode();U(p instanceof K,"serverChildren would be complete if leaf node"),d=Hm(r,p)}d=d,c=t.filter.updateFullNode(u,d,s)}else{const d=se(n);let p=qm(r,d,e.serverCache);p==null&&e.serverCache.isCompleteForChild(d)&&(p=u.getImmediateChild(d)),p!=null?c=t.filter.updateChild(u,d,p,we(n),l,s):e.eventCache.getNode().hasChild(d)?c=t.filter.updateChild(u,d,K.EMPTY_NODE,we(n),l,s):c=u,c.isEmpty()&&e.serverCache.isFullyInitialized()&&(o=hc(r,Ni(e)),o.isLeafNode()&&(c=t.filter.updateFullNode(c,o,s)))}return o=e.serverCache.isFullyInitialized()||dc(r,de())!=null,Yo(e,c,o,t.filter.filtersNodes())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ZM{constructor(e,n){this.query_=e,this.eventRegistrations_=[];const r=this.query_._queryParams,i=new $m(r.getIndex()),s=yM(r);this.processor_=HM(s);const o=n.serverCache,l=n.eventCache,u=i.updateFullNode(K.EMPTY_NODE,o.getNode(),null),c=s.updateFullNode(K.EMPTY_NODE,l.getNode(),null),d=new Hr(u,o.isFullyInitialized(),i.filtersNodes()),p=new Hr(c,l.isFullyInitialized(),s.filtersNodes());this.viewCache_=th(p,d),this.eventGenerator_=new CM(this.query_)}get query(){return this.query_}}function eO(t){return t.viewCache_.serverCache.getNode()}function tO(t){return cc(t.viewCache_)}function nO(t,e){const n=Ni(t.viewCache_);return n&&(t.query._queryParams.loadsAllData()||!ne(e)&&!n.getImmediateChild(se(e)).isEmpty())?n.getChild(e):null}function rw(t){return t.eventRegistrations_.length===0}function rO(t,e){t.eventRegistrations_.push(e)}function iw(t,e,n){const r=[];if(n){U(e==null,"A cancel should cancel all event registrations.");const i=t.query._path;t.eventRegistrations_.forEach(s=>{const o=s.createCancelEvent(n,i);o&&r.push(o)})}if(e){let i=[];for(let s=0;s<t.eventRegistrations_.length;++s){const o=t.eventRegistrations_[s];if(!o.matches(e))i.push(o);else if(e.hasAnyCallback()){i=i.concat(t.eventRegistrations_.slice(s+1));break}}t.eventRegistrations_=i}else t.eventRegistrations_=[];return r}function sw(t,e,n,r){e.type===ln.MERGE&&e.source.queryId!==null&&(U(Ni(t.viewCache_),"We should always have a full cache before handling merges"),U(cc(t.viewCache_),"Missing event cache, even though we have a server cache"));const i=t.viewCache_,s=GM(t.processor_,i,e,n,r);return qM(t.processor_,s.viewCache),U(s.viewCache.serverCache.isFullyInitialized()||!i.serverCache.isFullyInitialized(),"Once a server snap is complete, it should never go back"),t.viewCache_=s.viewCache,AS(t,s.changes,s.viewCache.eventCache.getNode(),null)}function iO(t,e){const n=t.viewCache_.eventCache,r=[];return n.getNode().isLeafNode()||n.getNode().forEachChild(Oe,(s,o)=>{r.push(bs(s,o))}),n.isFullyInitialized()&&r.push(_S(n.getNode())),AS(t,r,n.getNode(),e)}function AS(t,e,n,r){const i=r?[r]:t.eventRegistrations_;return kM(t.eventGenerator_,e,n,i)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let pc;class NS{constructor(){this.views=new Map}}function sO(t){U(!pc,"__referenceConstructor has already been defined"),pc=t}function oO(){return U(pc,"Reference.ts has not been loaded"),pc}function aO(t){return t.views.size===0}function Km(t,e,n,r){const i=e.source.queryId;if(i!==null){const s=t.views.get(i);return U(s!=null,"SyncTree gave us an op for an invalid query."),sw(s,e,n,r)}else{let s=[];for(const o of t.views.values())s=s.concat(sw(o,e,n,r));return s}}function PS(t,e,n,r,i){const s=e._queryIdentifier,o=t.views.get(s);if(!o){let l=hc(n,i?r:null),u=!1;l?u=!0:r instanceof K?(l=Hm(n,r),u=!1):(l=K.EMPTY_NODE,u=!1);const c=th(new Hr(l,u,!1),new Hr(r,i,!1));return new ZM(e,c)}return o}function lO(t,e,n,r,i,s){const o=PS(t,e,r,i,s);return t.views.has(e._queryIdentifier)||t.views.set(e._queryIdentifier,o),rO(o,n),iO(o,n)}function uO(t,e,n,r){const i=e._queryIdentifier,s=[];let o=[];const l=qr(t);if(i==="default")for(const[u,c]of t.views.entries())o=o.concat(iw(c,n,r)),rw(c)&&(t.views.delete(u),c.query._queryParams.loadsAllData()||s.push(c.query));else{const u=t.views.get(i);u&&(o=o.concat(iw(u,n,r)),rw(u)&&(t.views.delete(i),u.query._queryParams.loadsAllData()||s.push(u.query)))}return l&&!qr(t)&&s.push(new(oO())(e._repo,e._path)),{removed:s,events:o}}function xS(t){const e=[];for(const n of t.views.values())n.query._queryParams.loadsAllData()||e.push(n);return e}function jr(t,e){let n=null;for(const r of t.views.values())n=n||nO(r,e);return n}function bS(t,e){if(e._queryParams.loadsAllData())return rh(t);{const r=e._queryIdentifier;return t.views.get(r)}}function DS(t,e){return bS(t,e)!=null}function qr(t){return rh(t)!=null}function rh(t){for(const e of t.views.values())if(e.query._queryParams.loadsAllData())return e;return null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let mc;function cO(t){U(!mc,"__referenceConstructor has already been defined"),mc=t}function hO(){return U(mc,"Reference.ts has not been loaded"),mc}let dO=1;class ow{constructor(e){this.listenProvider_=e,this.syncPointTree_=new Se(null),this.pendingWriteTree_=$M(),this.tagToQueryMap=new Map,this.queryToTagMap=new Map}}function MS(t,e,n,r,i){return PM(t.pendingWriteTree_,e,n,r,i),i?sl(t,new Ai(vS(),e,n)):[]}function fi(t,e,n=!1){const r=xM(t.pendingWriteTree_,e);if(bM(t.pendingWriteTree_,e)){let s=new Se(null);return r.snap!=null?s=s.set(de(),!0):Lt(r.children,o=>{s=s.set(new ye(o),!0)}),sl(t,new uc(r.path,s,n))}else return[]}function il(t,e,n){return sl(t,new Ai(zm(),e,n))}function fO(t,e,n){const r=Se.fromObject(n);return sl(t,new ba(zm(),e,r))}function pO(t,e){return sl(t,new xa(zm(),e))}function mO(t,e,n){const r=Ym(t,n);if(r){const i=Xm(r),s=i.path,o=i.queryId,l=St(s,e),u=new xa(Wm(o),l);return Jm(t,s,u)}else return[]}function OS(t,e,n,r,i=!1){const s=e._path,o=t.syncPointTree_.get(s);let l=[];if(o&&(e._queryIdentifier==="default"||DS(o,e))){const u=uO(o,e,n,r);aO(o)&&(t.syncPointTree_=t.syncPointTree_.remove(s));const c=u.removed;if(l=u.events,!i){const d=c.findIndex(m=>m._queryParams.loadsAllData())!==-1,p=t.syncPointTree_.findOnPath(s,(m,E)=>qr(E));if(d&&!p){const m=t.syncPointTree_.subtree(s);if(!m.isEmpty()){const E=vO(m);for(let k=0;k<E.length;++k){const x=E[k],P=x.query,S=jS(t,x);t.listenProvider_.startListening(Jo(P),Da(t,P),S.hashFn,S.onComplete)}}}!p&&c.length>0&&!r&&(d?t.listenProvider_.stopListening(Jo(e),null):c.forEach(m=>{const E=t.queryToTagMap.get(ih(m));t.listenProvider_.stopListening(Jo(m),E)}))}wO(t,c)}return l}function LS(t,e,n,r){const i=Ym(t,r);if(i!=null){const s=Xm(i),o=s.path,l=s.queryId,u=St(o,e),c=new Ai(Wm(l),u,n);return Jm(t,o,c)}else return[]}function gO(t,e,n,r){const i=Ym(t,r);if(i){const s=Xm(i),o=s.path,l=s.queryId,u=St(o,e),c=Se.fromObject(n),d=new ba(Wm(l),u,c);return Jm(t,o,d)}else return[]}function _O(t,e,n,r=!1){const i=e._path;let s=null,o=!1;t.syncPointTree_.foreachOnPath(i,(m,E)=>{const k=St(m,i);s=s||jr(E,k),o=o||qr(E)});let l=t.syncPointTree_.get(i);l?(o=o||qr(l),s=s||jr(l,de())):(l=new NS,t.syncPointTree_=t.syncPointTree_.set(i,l));let u;s!=null?u=!0:(u=!1,s=K.EMPTY_NODE,t.syncPointTree_.subtree(i).foreachChild((E,k)=>{const x=jr(k,de());x&&(s=s.updateImmediateChild(E,x))}));const c=DS(l,e);if(!c&&!e._queryParams.loadsAllData()){const m=ih(e);U(!t.queryToTagMap.has(m),"View does not exist, but we have a tag");const E=EO();t.queryToTagMap.set(m,E),t.tagToQueryMap.set(E,m)}const d=nh(t.pendingWriteTree_,i);let p=lO(l,e,n,d,s,u);if(!c&&!o&&!r){const m=bS(l,e);p=p.concat(TO(t,e,m))}return p}function Qm(t,e,n){const i=t.pendingWriteTree_,s=t.syncPointTree_.findOnPath(e,(o,l)=>{const u=St(o,e),c=jr(l,u);if(c)return c});return IS(i,e,s,n,!0)}function yO(t,e){const n=e._path;let r=null;t.syncPointTree_.foreachOnPath(n,(c,d)=>{const p=St(c,n);r=r||jr(d,p)});let i=t.syncPointTree_.get(n);i?r=r||jr(i,de()):(i=new NS,t.syncPointTree_=t.syncPointTree_.set(n,i));const s=r!=null,o=s?new Hr(r,!0,!1):null,l=nh(t.pendingWriteTree_,e._path),u=PS(i,e,l,s?o.getNode():K.EMPTY_NODE,s);return tO(u)}function sl(t,e){return VS(e,t.syncPointTree_,null,nh(t.pendingWriteTree_,de()))}function VS(t,e,n,r){if(ne(t.path))return FS(t,e,n,r);{const i=e.get(de());n==null&&i!=null&&(n=jr(i,de()));let s=[];const o=se(t.path),l=t.operationForChild(o),u=e.children.get(o);if(u&&l){const c=n?n.getImmediateChild(o):null,d=SS(r,o);s=s.concat(VS(l,u,c,d))}return i&&(s=s.concat(Km(i,t,r,n))),s}}function FS(t,e,n,r){const i=e.get(de());n==null&&i!=null&&(n=jr(i,de()));let s=[];return e.children.inorderTraversal((o,l)=>{const u=n?n.getImmediateChild(o):null,c=SS(r,o),d=t.operationForChild(o);d&&(s=s.concat(FS(d,l,u,c)))}),i&&(s=s.concat(Km(i,t,r,n))),s}function jS(t,e){const n=e.query,r=Da(t,n);return{hashFn:()=>(eO(e)||K.EMPTY_NODE).hash(),onComplete:i=>{if(i==="ok")return r?mO(t,n._path,r):pO(t,n._path);{const s=_D(i,n);return OS(t,n,null,s)}}}}function Da(t,e){const n=ih(e);return t.queryToTagMap.get(n)}function ih(t){return t._path.toString()+"$"+t._queryIdentifier}function Ym(t,e){return t.tagToQueryMap.get(e)}function Xm(t){const e=t.indexOf("$");return U(e!==-1&&e<t.length-1,"Bad queryKey."),{queryId:t.substr(e+1),path:new ye(t.substr(0,e))}}function Jm(t,e,n){const r=t.syncPointTree_.get(e);U(r,"Missing sync point for query tag that we're tracking");const i=nh(t.pendingWriteTree_,e);return Km(r,n,i,null)}function vO(t){return t.fold((e,n,r)=>{if(n&&qr(n))return[rh(n)];{let i=[];return n&&(i=xS(n)),Lt(r,(s,o)=>{i=i.concat(o)}),i}})}function Jo(t){return t._queryParams.loadsAllData()&&!t._queryParams.isDefault()?new(hO())(t._repo,t._path):t}function wO(t,e){for(let n=0;n<e.length;++n){const r=e[n];if(!r._queryParams.loadsAllData()){const i=ih(r),s=t.queryToTagMap.get(i);t.queryToTagMap.delete(i),t.tagToQueryMap.delete(s)}}}function EO(){return dO++}function TO(t,e,n){const r=e._path,i=Da(t,e),s=jS(t,n),o=t.listenProvider_.startListening(Jo(e),i,s.hashFn,s.onComplete),l=t.syncPointTree_.subtree(r);if(i)U(!qr(l.value),"If we're adding a query, it shouldn't be shadowed");else{const u=l.fold((c,d,p)=>{if(!ne(c)&&d&&qr(d))return[rh(d).query];{let m=[];return d&&(m=m.concat(xS(d).map(E=>E.query))),Lt(p,(E,k)=>{m=m.concat(k)}),m}});for(let c=0;c<u.length;++c){const d=u[c];t.listenProvider_.stopListening(Jo(d),Da(t,d))}}return o}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zm{constructor(e){this.node_=e}getImmediateChild(e){const n=this.node_.getImmediateChild(e);return new Zm(n)}node(){return this.node_}}class eg{constructor(e,n){this.syncTree_=e,this.path_=n}getImmediateChild(e){const n=ze(this.path_,e);return new eg(this.syncTree_,n)}node(){return Qm(this.syncTree_,this.path_)}}const IO=function(t){return t=t||{},t.timestamp=t.timestamp||new Date().getTime(),t},aw=function(t,e,n){if(!t||typeof t!="object")return t;if(U(".sv"in t,"Unexpected leaf node or priority contents"),typeof t[".sv"]=="string")return SO(t[".sv"],e,n);if(typeof t[".sv"]=="object")return CO(t[".sv"],e);U(!1,"Unexpected server value: "+JSON.stringify(t,null,2))},SO=function(t,e,n){switch(t){case"timestamp":return n.timestamp;default:U(!1,"Unexpected server value: "+t)}},CO=function(t,e,n){t.hasOwnProperty("increment")||U(!1,"Unexpected server value: "+JSON.stringify(t,null,2));const r=t.increment;typeof r!="number"&&U(!1,"Unexpected increment value: "+r);const i=e.node();if(U(i!==null&&typeof i<"u","Expected ChildrenNode.EMPTY_NODE for nulls"),!i.isLeafNode())return r;const o=i.getValue();return typeof o!="number"?r:o+r},kO=function(t,e,n,r){return tg(e,new eg(n,t),r)},US=function(t,e,n){return tg(t,new Zm(e),n)};function tg(t,e,n){const r=t.getPriority().val(),i=aw(r,e.getImmediateChild(".priority"),n);let s;if(t.isLeafNode()){const o=t,l=aw(o.getValue(),e,n);return l!==o.getValue()||i!==o.getPriority().val()?new Ge(l,Ye(i)):t}else{const o=t;return s=o,i!==o.getPriority().val()&&(s=s.updatePriority(new Ge(i))),o.forEachChild(Oe,(l,u)=>{const c=tg(u,e.getImmediateChild(l),n);c!==u&&(s=s.updateImmediateChild(l,c))}),s}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ng{constructor(e="",n=null,r={children:{},childCount:0}){this.name=e,this.parent=n,this.node=r}}function rg(t,e){let n=e instanceof ye?e:new ye(e),r=t,i=se(n);for(;i!==null;){const s=Ns(r.node.children,i)||{children:{},childCount:0};r=new ng(i,r,s),n=we(n),i=se(n)}return r}function Xs(t){return t.node.value}function $S(t,e){t.node.value=e,Xf(t)}function BS(t){return t.node.childCount>0}function RO(t){return Xs(t)===void 0&&!BS(t)}function sh(t,e){Lt(t.node.children,(n,r)=>{e(new ng(n,t,r))})}function zS(t,e,n,r){n&&e(t),sh(t,i=>{zS(i,e,!0)})}function AO(t,e,n){let r=t.parent;for(;r!==null;){if(e(r))return!0;r=r.parent}return!1}function ol(t){return new ye(t.parent===null?t.name:ol(t.parent)+"/"+t.name)}function Xf(t){t.parent!==null&&NO(t.parent,t.name,t)}function NO(t,e,n){const r=RO(n),i=cr(t.node.children,e);r&&i?(delete t.node.children[e],t.node.childCount--,Xf(t)):!r&&!i&&(t.node.children[e]=n.node,t.node.childCount++,Xf(t))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const PO=/[\[\].#$\/\u0000-\u001F\u007F]/,xO=/[\[\].#$\u0000-\u001F\u007F]/,Rd=10*1024*1024,WS=function(t){return typeof t=="string"&&t.length!==0&&!PO.test(t)},HS=function(t){return typeof t=="string"&&t.length!==0&&!xO.test(t)},bO=function(t){return t&&(t=t.replace(/^\/*\.info(\/|$)/,"/")),HS(t)},DO=function(t,e,n,r){ig(Em(t,"value"),e,n)},ig=function(t,e,n){const r=n instanceof ye?new YD(n,t):n;if(e===void 0)throw new Error(t+"contains undefined "+ai(r));if(typeof e=="function")throw new Error(t+"contains a function "+ai(r)+" with contents = "+e.toString());if(UI(e))throw new Error(t+"contains "+e.toString()+" "+ai(r));if(typeof e=="string"&&e.length>Rd/3&&Kc(e)>Rd)throw new Error(t+"contains a string greater than "+Rd+" utf8 bytes "+ai(r)+" ('"+e.substring(0,50)+"...')");if(e&&typeof e=="object"){let i=!1,s=!1;if(Lt(e,(o,l)=>{if(o===".value")i=!0;else if(o!==".priority"&&o!==".sv"&&(s=!0,!WS(o)))throw new Error(t+" contains an invalid key ("+o+") "+ai(r)+`.  Keys must be non-empty strings and can't contain ".", "#", "$", "/", "[", or "]"`);XD(r,o),ig(t,l,r),JD(r)}),i&&s)throw new Error(t+' contains ".value" child '+ai(r)+" in addition to actual children.")}},qS=function(t,e,n,r){if(!HS(n))throw new Error(Em(t,e)+'was an invalid path = "'+n+`". Paths must be non-empty strings and can't contain ".", "#", "$", "[", or "]"`)},MO=function(t,e,n,r){n&&(n=n.replace(/^\/*\.info(\/|$)/,"/")),qS(t,e,n)},OO=function(t,e){if(se(e)===".info")throw new Error(t+" failed = Can't modify data under /.info/")},LO=function(t,e){const n=e.path.toString();if(typeof e.repoInfo.host!="string"||e.repoInfo.host.length===0||!WS(e.repoInfo.namespace)&&e.repoInfo.host.split(":")[0]!=="localhost"||n.length!==0&&!bO(n))throw new Error(Em(t,"url")+`must be a valid firebase URL and the path can't contain ".", "#", "$", "[", or "]".`)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class VO{constructor(){this.eventLists_=[],this.recursionDepth_=0}}function GS(t,e){let n=null;for(let r=0;r<e.length;r++){const i=e[r],s=i.getPath();n!==null&&!cS(s,n.path)&&(t.eventLists_.push(n),n=null),n===null&&(n={events:[],path:s}),n.events.push(i)}n&&t.eventLists_.push(n)}function Nn(t,e,n){GS(t,n),FO(t,r=>an(r,e)||an(e,r))}function FO(t,e){t.recursionDepth_++;let n=!0;for(let r=0;r<t.eventLists_.length;r++){const i=t.eventLists_[r];if(i){const s=i.path;e(s)?(jO(t.eventLists_[r]),t.eventLists_[r]=null):n=!1}}n&&(t.eventLists_=[]),t.recursionDepth_--}function jO(t){for(let e=0;e<t.events.length;e++){const n=t.events[e];if(n!==null){t.events[e]=null;const r=n.getEventRunner();Ko&&gt("event: "+n.toString()),Ys(r)}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const UO="repo_interrupt",$O=25;class BO{constructor(e,n,r,i){this.repoInfo_=e,this.forceRestClient_=n,this.authTokenProvider_=r,this.appCheckProvider_=i,this.dataUpdateCount=0,this.statsListener_=null,this.eventQueue_=new VO,this.nextWriteId_=1,this.interceptServerDataCallback_=null,this.onDisconnect_=lc(),this.transactionQueueTree_=new ng,this.persistentConnection_=null,this.key=this.repoInfo_.toURLString()}toString(){return(this.repoInfo_.secure?"https://":"http://")+this.repoInfo_.host}}function zO(t,e,n){if(t.stats_=Vm(t.repoInfo_),t.forceRestClient_||ED())t.server_=new ac(t.repoInfo_,(r,i,s,o)=>{lw(t,r,i,s,o)},t.authTokenProvider_,t.appCheckProvider_),setTimeout(()=>uw(t,!0),0);else{if(typeof n<"u"&&n!==null){if(typeof n!="object")throw new Error("Only objects are supported for option databaseAuthVariableOverride");try{Be(n)}catch(r){throw new Error("Invalid authOverride provided: "+r)}}t.persistentConnection_=new Yn(t.repoInfo_,e,(r,i,s,o)=>{lw(t,r,i,s,o)},r=>{uw(t,r)},r=>{HO(t,r)},t.authTokenProvider_,t.appCheckProvider_,n),t.server_=t.persistentConnection_}t.authTokenProvider_.addTokenChangeListener(r=>{t.server_.refreshAuthToken(r)}),t.appCheckProvider_.addTokenChangeListener(r=>{t.server_.refreshAppCheckToken(r.token)}),t.statsReporter_=kD(t.repoInfo_,()=>new SM(t.stats_,t.server_)),t.infoData_=new vM,t.infoSyncTree_=new ow({startListening:(r,i,s,o)=>{let l=[];const u=t.infoData_.getNode(r._path);return u.isEmpty()||(l=il(t.infoSyncTree_,r._path,u),setTimeout(()=>{o("ok")},0)),l},stopListening:()=>{}}),og(t,"connected",!1),t.serverSyncTree_=new ow({startListening:(r,i,s,o)=>(t.server_.listen(r,s,i,(l,u)=>{const c=o(l,u);Nn(t.eventQueue_,r._path,c)}),[]),stopListening:(r,i)=>{t.server_.unlisten(r,i)}})}function WO(t){const n=t.infoData_.getNode(new ye(".info/serverTimeOffset")).val()||0;return new Date().getTime()+n}function sg(t){return IO({timestamp:WO(t)})}function lw(t,e,n,r,i){t.dataUpdateCount++;const s=new ye(e);n=t.interceptServerDataCallback_?t.interceptServerDataCallback_(e,n):n;let o=[];if(i)if(r){const u=Yu(n,c=>Ye(c));o=gO(t.serverSyncTree_,s,u,i)}else{const u=Ye(n);o=LS(t.serverSyncTree_,s,u,i)}else if(r){const u=Yu(n,c=>Ye(c));o=fO(t.serverSyncTree_,s,u)}else{const u=Ye(n);o=il(t.serverSyncTree_,s,u)}let l=s;o.length>0&&(l=ah(t,s)),Nn(t.eventQueue_,l,o)}function uw(t,e){og(t,"connected",e),e===!1&&KO(t)}function HO(t,e){Lt(e,(n,r)=>{og(t,n,r)})}function og(t,e,n){const r=new ye("/.info/"+e),i=Ye(n);t.infoData_.updateSnapshot(r,i);const s=il(t.infoSyncTree_,r,i);Nn(t.eventQueue_,r,s)}function KS(t){return t.nextWriteId_++}function qO(t,e,n){const r=yO(t.serverSyncTree_,e);return r!=null?Promise.resolve(r):t.server_.get(e).then(i=>{const s=Ye(i).withIndex(e._queryParams.getIndex());_O(t.serverSyncTree_,e,n,!0);let o;if(e._queryParams.loadsAllData())o=il(t.serverSyncTree_,e._path,s);else{const l=Da(t.serverSyncTree_,e);o=LS(t.serverSyncTree_,e._path,s,l)}return Nn(t.eventQueue_,e._path,o),OS(t.serverSyncTree_,e,n,null,!0),s},i=>(oh(t,"get for query "+Be(e)+" failed: "+i),Promise.reject(new Error(i))))}function GO(t,e,n,r,i){oh(t,"set",{path:e.toString(),value:n,priority:r});const s=sg(t),o=Ye(n,r),l=Qm(t.serverSyncTree_,e),u=US(o,l,s),c=KS(t),d=MS(t.serverSyncTree_,e,u,c,!0);GS(t.eventQueue_,d),t.server_.put(e.toString(),o.val(!0),(m,E)=>{const k=m==="ok";k||Ot("set at "+e+" failed: "+m);const x=fi(t.serverSyncTree_,c,!k);Nn(t.eventQueue_,e,x),YO(t,i,m,E)});const p=ZS(t,e);ah(t,p),Nn(t.eventQueue_,p,[])}function KO(t){oh(t,"onDisconnectEvents");const e=sg(t),n=lc();qf(t.onDisconnect_,de(),(i,s)=>{const o=kO(i,s,t.serverSyncTree_,e);yS(n,i,o)});let r=[];qf(n,de(),(i,s)=>{r=r.concat(il(t.serverSyncTree_,i,s));const o=ZS(t,i);ah(t,o)}),t.onDisconnect_=lc(),Nn(t.eventQueue_,de(),r)}function QO(t){t.persistentConnection_&&t.persistentConnection_.interrupt(UO)}function oh(t,...e){let n="";t.persistentConnection_&&(n=t.persistentConnection_.id+":"),gt(n,...e)}function YO(t,e,n,r){e&&Ys(()=>{if(n==="ok")e(null);else{const i=(n||"error").toUpperCase();let s=i;r&&(s+=": "+r);const o=new Error(s);o.code=i,e(o)}})}function QS(t,e,n){return Qm(t.serverSyncTree_,e,n)||K.EMPTY_NODE}function ag(t,e=t.transactionQueueTree_){if(e||lh(t,e),Xs(e)){const n=XS(t,e);U(n.length>0,"Sending zero length transaction queue"),n.every(i=>i.status===0)&&XO(t,ol(e),n)}else BS(e)&&sh(e,n=>{ag(t,n)})}function XO(t,e,n){const r=n.map(c=>c.currentWriteId),i=QS(t,e,r);let s=i;const o=i.hash();for(let c=0;c<n.length;c++){const d=n[c];U(d.status===0,"tryToSendTransactionQueue_: items in queue should all be run."),d.status=1,d.retryCount++;const p=St(e,d.path);s=s.updateChild(p,d.currentOutputSnapshotRaw)}const l=s.val(!0),u=e;t.server_.put(u.toString(),l,c=>{oh(t,"transaction put response",{path:u.toString(),status:c});let d=[];if(c==="ok"){const p=[];for(let m=0;m<n.length;m++)n[m].status=2,d=d.concat(fi(t.serverSyncTree_,n[m].currentWriteId)),n[m].onComplete&&p.push(()=>n[m].onComplete(null,!0,n[m].currentOutputSnapshotResolved)),n[m].unwatcher();lh(t,rg(t.transactionQueueTree_,e)),ag(t,t.transactionQueueTree_),Nn(t.eventQueue_,e,d);for(let m=0;m<p.length;m++)Ys(p[m])}else{if(c==="datastale")for(let p=0;p<n.length;p++)n[p].status===3?n[p].status=4:n[p].status=0;else{Ot("transaction at "+u.toString()+" failed: "+c);for(let p=0;p<n.length;p++)n[p].status=4,n[p].abortReason=c}ah(t,e)}},o)}function ah(t,e){const n=YS(t,e),r=ol(n),i=XS(t,n);return JO(t,i,r),r}function JO(t,e,n){if(e.length===0)return;const r=[];let i=[];const o=e.filter(l=>l.status===0).map(l=>l.currentWriteId);for(let l=0;l<e.length;l++){const u=e[l],c=St(n,u.path);let d=!1,p;if(U(c!==null,"rerunTransactionsUnderNode_: relativePath should not be null."),u.status===4)d=!0,p=u.abortReason,i=i.concat(fi(t.serverSyncTree_,u.currentWriteId,!0));else if(u.status===0)if(u.retryCount>=$O)d=!0,p="maxretry",i=i.concat(fi(t.serverSyncTree_,u.currentWriteId,!0));else{const m=QS(t,u.path,o);u.currentInputSnapshot=m;const E=e[l].update(m.val());if(E!==void 0){ig("transaction failed: Data returned ",E,u.path);let k=Ye(E);typeof E=="object"&&E!=null&&cr(E,".priority")||(k=k.updatePriority(m.getPriority()));const P=u.currentWriteId,S=sg(t),w=US(k,m,S);u.currentOutputSnapshotRaw=k,u.currentOutputSnapshotResolved=w,u.currentWriteId=KS(t),o.splice(o.indexOf(P),1),i=i.concat(MS(t.serverSyncTree_,u.path,w,u.currentWriteId,u.applyLocally)),i=i.concat(fi(t.serverSyncTree_,P,!0))}else d=!0,p="nodata",i=i.concat(fi(t.serverSyncTree_,u.currentWriteId,!0))}Nn(t.eventQueue_,n,i),i=[],d&&(e[l].status=2,function(m){setTimeout(m,Math.floor(0))}(e[l].unwatcher),e[l].onComplete&&(p==="nodata"?r.push(()=>e[l].onComplete(null,!1,e[l].currentInputSnapshot)):r.push(()=>e[l].onComplete(new Error(p),!1,null))))}lh(t,t.transactionQueueTree_);for(let l=0;l<r.length;l++)Ys(r[l]);ag(t,t.transactionQueueTree_)}function YS(t,e){let n,r=t.transactionQueueTree_;for(n=se(e);n!==null&&Xs(r)===void 0;)r=rg(r,n),e=we(e),n=se(e);return r}function XS(t,e){const n=[];return JS(t,e,n),n.sort((r,i)=>r.order-i.order),n}function JS(t,e,n){const r=Xs(e);if(r)for(let i=0;i<r.length;i++)n.push(r[i]);sh(e,i=>{JS(t,i,n)})}function lh(t,e){const n=Xs(e);if(n){let r=0;for(let i=0;i<n.length;i++)n[i].status!==2&&(n[r]=n[i],r++);n.length=r,$S(e,n.length>0?n:void 0)}sh(e,r=>{lh(t,r)})}function ZS(t,e){const n=ol(YS(t,e)),r=rg(t.transactionQueueTree_,e);return AO(r,i=>{Ad(t,i)}),Ad(t,r),zS(r,i=>{Ad(t,i)}),n}function Ad(t,e){const n=Xs(e);if(n){const r=[];let i=[],s=-1;for(let o=0;o<n.length;o++)n[o].status===3||(n[o].status===1?(U(s===o-1,"All SENT items should be at beginning of queue."),s=o,n[o].status=3,n[o].abortReason="set"):(U(n[o].status===0,"Unexpected transaction status in abort"),n[o].unwatcher(),i=i.concat(fi(t.serverSyncTree_,n[o].currentWriteId,!0)),n[o].onComplete&&r.push(n[o].onComplete.bind(null,new Error("set"),!1,null))));s===-1?$S(e,void 0):n.length=s+1,Nn(t.eventQueue_,ol(e),i);for(let o=0;o<r.length;o++)Ys(r[o])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ZO(t){let e="";const n=t.split("/");for(let r=0;r<n.length;r++)if(n[r].length>0){let i=n[r];try{i=decodeURIComponent(i.replace(/\+/g," "))}catch{}e+="/"+i}return e}function eL(t){const e={};t.charAt(0)==="?"&&(t=t.substring(1));for(const n of t.split("&")){if(n.length===0)continue;const r=n.split("=");r.length===2?e[decodeURIComponent(r[0])]=decodeURIComponent(r[1]):Ot(`Invalid query segment '${n}' in query '${t}'`)}return e}const cw=function(t,e){const n=tL(t),r=n.namespace;n.domain==="firebase.com"&&sr(n.host+" is no longer supported. Please use <YOUR FIREBASE>.firebaseio.com instead"),(!r||r==="undefined")&&n.domain!=="localhost"&&sr("Cannot parse Firebase url. Please use https://<YOUR FIREBASE>.firebaseio.com"),n.secure||dD();const i=n.scheme==="ws"||n.scheme==="wss";return{repoInfo:new JI(n.host,n.secure,r,i,e,"",r!==n.subdomain),path:new ye(n.pathString)}},tL=function(t){let e="",n="",r="",i="",s="",o=!0,l="https",u=443;if(typeof t=="string"){let c=t.indexOf("//");c>=0&&(l=t.substring(0,c-1),t=t.substring(c+2));let d=t.indexOf("/");d===-1&&(d=t.length);let p=t.indexOf("?");p===-1&&(p=t.length),e=t.substring(0,Math.min(d,p)),d<p&&(i=ZO(t.substring(d,p)));const m=eL(t.substring(Math.min(t.length,p)));c=e.indexOf(":"),c>=0?(o=l==="https"||l==="wss",u=parseInt(e.substring(c+1),10)):c=e.length;const E=e.slice(0,c);if(E.toLowerCase()==="localhost")n="localhost";else if(E.split(".").length<=2)n=E;else{const k=e.indexOf(".");r=e.substring(0,k).toLowerCase(),n=e.substring(k+1),s=r}"ns"in m&&(s=m.ns)}return{host:e,port:u,domain:n,subdomain:r,secure:o,scheme:l,pathString:i,namespace:s}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nL{constructor(e,n,r,i){this.eventType=e,this.eventRegistration=n,this.snapshot=r,this.prevName=i}getPath(){const e=this.snapshot.ref;return this.eventType==="value"?e._path:e.parent._path}getEventType(){return this.eventType}getEventRunner(){return this.eventRegistration.getEventRunner(this)}toString(){return this.getPath().toString()+":"+this.eventType+":"+Be(this.snapshot.exportVal())}}class rL{constructor(e,n,r){this.eventRegistration=e,this.error=n,this.path=r}getPath(){return this.path}getEventType(){return"cancel"}getEventRunner(){return this.eventRegistration.getEventRunner(this)}toString(){return this.path.toString()+":cancel"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iL{constructor(e,n){this.snapshotCallback=e,this.cancelCallback=n}onValue(e,n){this.snapshotCallback.call(null,e,n)}onCancel(e){return U(this.hasCancelCallback,"Raising a cancel event on a listener with no cancel callback"),this.cancelCallback.call(null,e)}get hasCancelCallback(){return!!this.cancelCallback}matches(e){return this.snapshotCallback===e.snapshotCallback||this.snapshotCallback.userCallback!==void 0&&this.snapshotCallback.userCallback===e.snapshotCallback.userCallback&&this.snapshotCallback.context===e.snapshotCallback.context}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lg{constructor(e,n,r,i){this._repo=e,this._path=n,this._queryParams=r,this._orderByCalled=i}get key(){return ne(this._path)?null:aS(this._path)}get ref(){return new hr(this._repo,this._path)}get _queryIdentifier(){const e=Qv(this._queryParams),n=Om(e);return n==="{}"?"default":n}get _queryObject(){return Qv(this._queryParams)}isEqual(e){if(e=Je(e),!(e instanceof lg))return!1;const n=this._repo===e._repo,r=cS(this._path,e._path),i=this._queryIdentifier===e._queryIdentifier;return n&&r&&i}toJSON(){return this.toString()}toString(){return this._repo.toString()+QD(this._path)}}class hr extends lg{constructor(e,n){super(e,n,new Bm,!1)}get parent(){const e=uS(this._path);return e===null?null:new hr(this._repo,e)}get root(){let e=this;for(;e.parent!==null;)e=e.parent;return e}}class Ma{constructor(e,n,r){this._node=e,this.ref=n,this._index=r}get priority(){return this._node.getPriority().val()}get key(){return this.ref.key}get size(){return this._node.numChildren()}child(e){const n=new ye(e),r=Jf(this.ref,e);return new Ma(this._node.getChild(n),r,Oe)}exists(){return!this._node.isEmpty()}exportVal(){return this._node.val(!0)}forEach(e){return this._node.isLeafNode()?!1:!!this._node.forEachChild(this._index,(r,i)=>e(new Ma(i,Jf(this.ref,r),Oe)))}hasChild(e){const n=new ye(e);return!this._node.getChild(n).isEmpty()}hasChildren(){return this._node.isLeafNode()?!1:!this._node.isEmpty()}toJSON(){return this.exportVal()}val(){return this._node.val()}}function Zo(t,e){return t=Je(t),t._checkNotDeleted("ref"),e!==void 0?Jf(t._root,e):t._root}function Jf(t,e){return t=Je(t),se(t._path)===null?MO("child","path",e):qS("child","path",e),new hr(t._repo,ze(t._path,e))}function hw(t,e){t=Je(t),OO("set",t._path),DO("set",e,t._path);const n=new Gc;return GO(t._repo,t._path,e,null,n.wrapCallback(()=>{})),n.promise}function gc(t){t=Je(t);const e=new iL(()=>{}),n=new ug(e);return qO(t._repo,t,n).then(r=>new Ma(r,new hr(t._repo,t._path),t._queryParams.getIndex()))}class ug{constructor(e){this.callbackContext=e}respondsTo(e){return e==="value"}createEvent(e,n){const r=n._queryParams.getIndex();return new nL("value",this,new Ma(e.snapshotNode,new hr(n._repo,n._path),r))}getEventRunner(e){return e.getEventType()==="cancel"?()=>this.callbackContext.onCancel(e.error):()=>this.callbackContext.onValue(e.snapshot,null)}createCancelEvent(e,n){return this.callbackContext.hasCancelCallback?new rL(this,e,n):null}matches(e){return e instanceof ug?!e.callbackContext||!this.callbackContext?!0:e.callbackContext.matches(this.callbackContext):!1}hasAnyCallback(){return this.callbackContext!==null}}sO(hr);cO(hr);/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sL="FIREBASE_DATABASE_EMULATOR_HOST",Zf={};let oL=!1;function aL(t,e,n,r){t.repoInfo_=new JI(`${e}:${n}`,!1,t.repoInfo_.namespace,t.repoInfo_.webSocketOnly,t.repoInfo_.nodeAdmin,t.repoInfo_.persistenceKey,t.repoInfo_.includeNamespaceInQueryParams,!0),r&&(t.authTokenProvider_=r)}function lL(t,e,n,r,i){let s=r||t.options.databaseURL;s===void 0&&(t.options.projectId||sr("Can't determine Firebase Database URL. Be sure to include  a Project ID when calling firebase.initializeApp()."),gt("Using default host for project ",t.options.projectId),s=`${t.options.projectId}-default-rtdb.firebaseio.com`);let o=cw(s,i),l=o.repoInfo,u;typeof process<"u"&&xv&&(u=xv[sL]),u?(s=`http://${u}?ns=${l.namespace}`,o=cw(s,i),l=o.repoInfo):o.repoInfo.secure;const c=new ID(t.name,t.options,e);LO("Invalid Firebase Database URL",o),ne(o.path)||sr("Database URL must point to the root of a Firebase Database (not including a child path).");const d=cL(l,t,c,new TD(t.name,n));return new hL(d,t)}function uL(t,e){const n=Zf[e];(!n||n[t.key]!==t)&&sr(`Database ${e}(${t.repoInfo_}) has already been deleted.`),QO(t),delete n[t.key]}function cL(t,e,n,r){let i=Zf[e.name];i||(i={},Zf[e.name]=i);let s=i[t.toURLString()];return s&&sr("Database initialized multiple times. Please make sure the format of the database URL matches with each database() call."),s=new BO(t,oL,n,r),i[t.toURLString()]=s,s}class hL{constructor(e,n){this._repoInternal=e,this.app=n,this.type="database",this._instanceStarted=!1}get _repo(){return this._instanceStarted||(zO(this._repoInternal,this.app.options.appId,this.app.options.databaseAuthVariableOverride),this._instanceStarted=!0),this._repoInternal}get _root(){return this._rootInternal||(this._rootInternal=new hr(this._repo,de())),this._rootInternal}_delete(){return this._rootInternal!==null&&(uL(this._repo,this.app.name),this._repoInternal=null,this._rootInternal=null),Promise.resolve()}_checkNotDeleted(e){this._rootInternal===null&&sr("Cannot call "+e+" on a deleted database.")}}function dL(t=Im(),e){const n=Yc(t,"database").getImmediate({identifier:e});if(!n._instanceStarted){const r=G0("database");r&&fL(n,...r)}return n}function fL(t,e,n,r={}){t=Je(t),t._checkNotDeleted("useEmulator"),t._instanceStarted&&sr("Cannot call useEmulator() after instance has already been initialized.");const i=t._repoInternal;let s;if(i.repoInfo_.nodeAdmin)r.mockUserToken&&sr('mockUserToken is not supported by the Admin SDK. For client access with mock users, please use the "firebase" package instead of "firebase-admin".'),s=new yu(yu.OWNER);else if(r.mockUserToken){const o=typeof r.mockUserToken=="string"?r.mockUserToken:Y0(r.mockUserToken,t.app.options.projectId);s=new yu(o)}aL(i,e,n,s)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pL(t){oD(Oi),Ci(new zr("database",(e,{instanceIdentifier:n})=>{const r=e.getProvider("app").getImmediate(),i=e.getProvider("auth-internal"),s=e.getProvider("app-check-internal");return lL(r,i,s,n)},"PUBLIC").setMultipleInstances(!0)),Sn(bv,Dv,t),Sn(bv,Dv,"esm2017")}Yn.prototype.simpleListen=function(t,e){this.sendRequest("q",{p:t},e)};Yn.prototype.echo=function(t,e){this.sendRequest("echo",{d:t},e)};pL();var dw=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var yi,eC;(function(){var t;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(T,y){function v(){}v.prototype=y.prototype,T.D=y.prototype,T.prototype=new v,T.prototype.constructor=T,T.C=function(I,A,N){for(var C=Array(arguments.length-2),At=2;At<arguments.length;At++)C[At-2]=arguments[At];return y.prototype[A].apply(I,C)}}function n(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}e(r,n),r.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(T,y,v){v||(v=0);var I=Array(16);if(typeof y=="string")for(var A=0;16>A;++A)I[A]=y.charCodeAt(v++)|y.charCodeAt(v++)<<8|y.charCodeAt(v++)<<16|y.charCodeAt(v++)<<24;else for(A=0;16>A;++A)I[A]=y[v++]|y[v++]<<8|y[v++]<<16|y[v++]<<24;y=T.g[0],v=T.g[1],A=T.g[2];var N=T.g[3],C=y+(N^v&(A^N))+I[0]+3614090360&4294967295;y=v+(C<<7&4294967295|C>>>25),C=N+(A^y&(v^A))+I[1]+3905402710&4294967295,N=y+(C<<12&4294967295|C>>>20),C=A+(v^N&(y^v))+I[2]+606105819&4294967295,A=N+(C<<17&4294967295|C>>>15),C=v+(y^A&(N^y))+I[3]+3250441966&4294967295,v=A+(C<<22&4294967295|C>>>10),C=y+(N^v&(A^N))+I[4]+4118548399&4294967295,y=v+(C<<7&4294967295|C>>>25),C=N+(A^y&(v^A))+I[5]+1200080426&4294967295,N=y+(C<<12&4294967295|C>>>20),C=A+(v^N&(y^v))+I[6]+2821735955&4294967295,A=N+(C<<17&4294967295|C>>>15),C=v+(y^A&(N^y))+I[7]+4249261313&4294967295,v=A+(C<<22&4294967295|C>>>10),C=y+(N^v&(A^N))+I[8]+1770035416&4294967295,y=v+(C<<7&4294967295|C>>>25),C=N+(A^y&(v^A))+I[9]+2336552879&4294967295,N=y+(C<<12&4294967295|C>>>20),C=A+(v^N&(y^v))+I[10]+4294925233&4294967295,A=N+(C<<17&4294967295|C>>>15),C=v+(y^A&(N^y))+I[11]+2304563134&4294967295,v=A+(C<<22&4294967295|C>>>10),C=y+(N^v&(A^N))+I[12]+1804603682&4294967295,y=v+(C<<7&4294967295|C>>>25),C=N+(A^y&(v^A))+I[13]+4254626195&4294967295,N=y+(C<<12&4294967295|C>>>20),C=A+(v^N&(y^v))+I[14]+2792965006&4294967295,A=N+(C<<17&4294967295|C>>>15),C=v+(y^A&(N^y))+I[15]+1236535329&4294967295,v=A+(C<<22&4294967295|C>>>10),C=y+(A^N&(v^A))+I[1]+4129170786&4294967295,y=v+(C<<5&4294967295|C>>>27),C=N+(v^A&(y^v))+I[6]+3225465664&4294967295,N=y+(C<<9&4294967295|C>>>23),C=A+(y^v&(N^y))+I[11]+643717713&4294967295,A=N+(C<<14&4294967295|C>>>18),C=v+(N^y&(A^N))+I[0]+3921069994&4294967295,v=A+(C<<20&4294967295|C>>>12),C=y+(A^N&(v^A))+I[5]+3593408605&4294967295,y=v+(C<<5&4294967295|C>>>27),C=N+(v^A&(y^v))+I[10]+38016083&4294967295,N=y+(C<<9&4294967295|C>>>23),C=A+(y^v&(N^y))+I[15]+3634488961&4294967295,A=N+(C<<14&4294967295|C>>>18),C=v+(N^y&(A^N))+I[4]+3889429448&4294967295,v=A+(C<<20&4294967295|C>>>12),C=y+(A^N&(v^A))+I[9]+568446438&4294967295,y=v+(C<<5&4294967295|C>>>27),C=N+(v^A&(y^v))+I[14]+3275163606&4294967295,N=y+(C<<9&4294967295|C>>>23),C=A+(y^v&(N^y))+I[3]+4107603335&4294967295,A=N+(C<<14&4294967295|C>>>18),C=v+(N^y&(A^N))+I[8]+1163531501&4294967295,v=A+(C<<20&4294967295|C>>>12),C=y+(A^N&(v^A))+I[13]+2850285829&4294967295,y=v+(C<<5&4294967295|C>>>27),C=N+(v^A&(y^v))+I[2]+4243563512&4294967295,N=y+(C<<9&4294967295|C>>>23),C=A+(y^v&(N^y))+I[7]+1735328473&4294967295,A=N+(C<<14&4294967295|C>>>18),C=v+(N^y&(A^N))+I[12]+2368359562&4294967295,v=A+(C<<20&4294967295|C>>>12),C=y+(v^A^N)+I[5]+4294588738&4294967295,y=v+(C<<4&4294967295|C>>>28),C=N+(y^v^A)+I[8]+2272392833&4294967295,N=y+(C<<11&4294967295|C>>>21),C=A+(N^y^v)+I[11]+1839030562&4294967295,A=N+(C<<16&4294967295|C>>>16),C=v+(A^N^y)+I[14]+4259657740&4294967295,v=A+(C<<23&4294967295|C>>>9),C=y+(v^A^N)+I[1]+2763975236&4294967295,y=v+(C<<4&4294967295|C>>>28),C=N+(y^v^A)+I[4]+1272893353&4294967295,N=y+(C<<11&4294967295|C>>>21),C=A+(N^y^v)+I[7]+4139469664&4294967295,A=N+(C<<16&4294967295|C>>>16),C=v+(A^N^y)+I[10]+3200236656&4294967295,v=A+(C<<23&4294967295|C>>>9),C=y+(v^A^N)+I[13]+681279174&4294967295,y=v+(C<<4&4294967295|C>>>28),C=N+(y^v^A)+I[0]+3936430074&4294967295,N=y+(C<<11&4294967295|C>>>21),C=A+(N^y^v)+I[3]+3572445317&4294967295,A=N+(C<<16&4294967295|C>>>16),C=v+(A^N^y)+I[6]+76029189&4294967295,v=A+(C<<23&4294967295|C>>>9),C=y+(v^A^N)+I[9]+3654602809&4294967295,y=v+(C<<4&4294967295|C>>>28),C=N+(y^v^A)+I[12]+3873151461&4294967295,N=y+(C<<11&4294967295|C>>>21),C=A+(N^y^v)+I[15]+530742520&4294967295,A=N+(C<<16&4294967295|C>>>16),C=v+(A^N^y)+I[2]+3299628645&4294967295,v=A+(C<<23&4294967295|C>>>9),C=y+(A^(v|~N))+I[0]+4096336452&4294967295,y=v+(C<<6&4294967295|C>>>26),C=N+(v^(y|~A))+I[7]+1126891415&4294967295,N=y+(C<<10&4294967295|C>>>22),C=A+(y^(N|~v))+I[14]+2878612391&4294967295,A=N+(C<<15&4294967295|C>>>17),C=v+(N^(A|~y))+I[5]+4237533241&4294967295,v=A+(C<<21&4294967295|C>>>11),C=y+(A^(v|~N))+I[12]+1700485571&4294967295,y=v+(C<<6&4294967295|C>>>26),C=N+(v^(y|~A))+I[3]+2399980690&4294967295,N=y+(C<<10&4294967295|C>>>22),C=A+(y^(N|~v))+I[10]+4293915773&4294967295,A=N+(C<<15&4294967295|C>>>17),C=v+(N^(A|~y))+I[1]+2240044497&4294967295,v=A+(C<<21&4294967295|C>>>11),C=y+(A^(v|~N))+I[8]+1873313359&4294967295,y=v+(C<<6&4294967295|C>>>26),C=N+(v^(y|~A))+I[15]+4264355552&4294967295,N=y+(C<<10&4294967295|C>>>22),C=A+(y^(N|~v))+I[6]+2734768916&4294967295,A=N+(C<<15&4294967295|C>>>17),C=v+(N^(A|~y))+I[13]+1309151649&4294967295,v=A+(C<<21&4294967295|C>>>11),C=y+(A^(v|~N))+I[4]+4149444226&4294967295,y=v+(C<<6&4294967295|C>>>26),C=N+(v^(y|~A))+I[11]+3174756917&4294967295,N=y+(C<<10&4294967295|C>>>22),C=A+(y^(N|~v))+I[2]+718787259&4294967295,A=N+(C<<15&4294967295|C>>>17),C=v+(N^(A|~y))+I[9]+3951481745&4294967295,T.g[0]=T.g[0]+y&4294967295,T.g[1]=T.g[1]+(A+(C<<21&4294967295|C>>>11))&4294967295,T.g[2]=T.g[2]+A&4294967295,T.g[3]=T.g[3]+N&4294967295}r.prototype.u=function(T,y){y===void 0&&(y=T.length);for(var v=y-this.blockSize,I=this.B,A=this.h,N=0;N<y;){if(A==0)for(;N<=v;)i(this,T,N),N+=this.blockSize;if(typeof T=="string"){for(;N<y;)if(I[A++]=T.charCodeAt(N++),A==this.blockSize){i(this,I),A=0;break}}else for(;N<y;)if(I[A++]=T[N++],A==this.blockSize){i(this,I),A=0;break}}this.h=A,this.o+=y},r.prototype.v=function(){var T=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);T[0]=128;for(var y=1;y<T.length-8;++y)T[y]=0;var v=8*this.o;for(y=T.length-8;y<T.length;++y)T[y]=v&255,v/=256;for(this.u(T),T=Array(16),y=v=0;4>y;++y)for(var I=0;32>I;I+=8)T[v++]=this.g[y]>>>I&255;return T};function s(T,y){var v=l;return Object.prototype.hasOwnProperty.call(v,T)?v[T]:v[T]=y(T)}function o(T,y){this.h=y;for(var v=[],I=!0,A=T.length-1;0<=A;A--){var N=T[A]|0;I&&N==y||(v[A]=N,I=!1)}this.g=v}var l={};function u(T){return-128<=T&&128>T?s(T,function(y){return new o([y|0],0>y?-1:0)}):new o([T|0],0>T?-1:0)}function c(T){if(isNaN(T)||!isFinite(T))return p;if(0>T)return P(c(-T));for(var y=[],v=1,I=0;T>=v;I++)y[I]=T/v|0,v*=4294967296;return new o(y,0)}function d(T,y){if(T.length==0)throw Error("number format error: empty string");if(y=y||10,2>y||36<y)throw Error("radix out of range: "+y);if(T.charAt(0)=="-")return P(d(T.substring(1),y));if(0<=T.indexOf("-"))throw Error('number format error: interior "-" character');for(var v=c(Math.pow(y,8)),I=p,A=0;A<T.length;A+=8){var N=Math.min(8,T.length-A),C=parseInt(T.substring(A,A+N),y);8>N?(N=c(Math.pow(y,N)),I=I.j(N).add(c(C))):(I=I.j(v),I=I.add(c(C)))}return I}var p=u(0),m=u(1),E=u(16777216);t=o.prototype,t.m=function(){if(x(this))return-P(this).m();for(var T=0,y=1,v=0;v<this.g.length;v++){var I=this.i(v);T+=(0<=I?I:4294967296+I)*y,y*=4294967296}return T},t.toString=function(T){if(T=T||10,2>T||36<T)throw Error("radix out of range: "+T);if(k(this))return"0";if(x(this))return"-"+P(this).toString(T);for(var y=c(Math.pow(T,6)),v=this,I="";;){var A=D(v,y).g;v=S(v,A.j(y));var N=((0<v.g.length?v.g[0]:v.h)>>>0).toString(T);if(v=A,k(v))return N+I;for(;6>N.length;)N="0"+N;I=N+I}},t.i=function(T){return 0>T?0:T<this.g.length?this.g[T]:this.h};function k(T){if(T.h!=0)return!1;for(var y=0;y<T.g.length;y++)if(T.g[y]!=0)return!1;return!0}function x(T){return T.h==-1}t.l=function(T){return T=S(this,T),x(T)?-1:k(T)?0:1};function P(T){for(var y=T.g.length,v=[],I=0;I<y;I++)v[I]=~T.g[I];return new o(v,~T.h).add(m)}t.abs=function(){return x(this)?P(this):this},t.add=function(T){for(var y=Math.max(this.g.length,T.g.length),v=[],I=0,A=0;A<=y;A++){var N=I+(this.i(A)&65535)+(T.i(A)&65535),C=(N>>>16)+(this.i(A)>>>16)+(T.i(A)>>>16);I=C>>>16,N&=65535,C&=65535,v[A]=C<<16|N}return new o(v,v[v.length-1]&-2147483648?-1:0)};function S(T,y){return T.add(P(y))}t.j=function(T){if(k(this)||k(T))return p;if(x(this))return x(T)?P(this).j(P(T)):P(P(this).j(T));if(x(T))return P(this.j(P(T)));if(0>this.l(E)&&0>T.l(E))return c(this.m()*T.m());for(var y=this.g.length+T.g.length,v=[],I=0;I<2*y;I++)v[I]=0;for(I=0;I<this.g.length;I++)for(var A=0;A<T.g.length;A++){var N=this.i(I)>>>16,C=this.i(I)&65535,At=T.i(A)>>>16,bn=T.i(A)&65535;v[2*I+2*A]+=C*bn,w(v,2*I+2*A),v[2*I+2*A+1]+=N*bn,w(v,2*I+2*A+1),v[2*I+2*A+1]+=C*At,w(v,2*I+2*A+1),v[2*I+2*A+2]+=N*At,w(v,2*I+2*A+2)}for(I=0;I<y;I++)v[I]=v[2*I+1]<<16|v[2*I];for(I=y;I<2*y;I++)v[I]=0;return new o(v,0)};function w(T,y){for(;(T[y]&65535)!=T[y];)T[y+1]+=T[y]>>>16,T[y]&=65535,y++}function R(T,y){this.g=T,this.h=y}function D(T,y){if(k(y))throw Error("division by zero");if(k(T))return new R(p,p);if(x(T))return y=D(P(T),y),new R(P(y.g),P(y.h));if(x(y))return y=D(T,P(y)),new R(P(y.g),y.h);if(30<T.g.length){if(x(T)||x(y))throw Error("slowDivide_ only works with positive integers.");for(var v=m,I=y;0>=I.l(T);)v=j(v),I=j(I);var A=O(v,1),N=O(I,1);for(I=O(I,2),v=O(v,2);!k(I);){var C=N.add(I);0>=C.l(T)&&(A=A.add(v),N=C),I=O(I,1),v=O(v,1)}return y=S(T,A.j(y)),new R(A,y)}for(A=p;0<=T.l(y);){for(v=Math.max(1,Math.floor(T.m()/y.m())),I=Math.ceil(Math.log(v)/Math.LN2),I=48>=I?1:Math.pow(2,I-48),N=c(v),C=N.j(y);x(C)||0<C.l(T);)v-=I,N=c(v),C=N.j(y);k(N)&&(N=m),A=A.add(N),T=S(T,C)}return new R(A,T)}t.A=function(T){return D(this,T).h},t.and=function(T){for(var y=Math.max(this.g.length,T.g.length),v=[],I=0;I<y;I++)v[I]=this.i(I)&T.i(I);return new o(v,this.h&T.h)},t.or=function(T){for(var y=Math.max(this.g.length,T.g.length),v=[],I=0;I<y;I++)v[I]=this.i(I)|T.i(I);return new o(v,this.h|T.h)},t.xor=function(T){for(var y=Math.max(this.g.length,T.g.length),v=[],I=0;I<y;I++)v[I]=this.i(I)^T.i(I);return new o(v,this.h^T.h)};function j(T){for(var y=T.g.length+1,v=[],I=0;I<y;I++)v[I]=T.i(I)<<1|T.i(I-1)>>>31;return new o(v,T.h)}function O(T,y){var v=y>>5;y%=32;for(var I=T.g.length-v,A=[],N=0;N<I;N++)A[N]=0<y?T.i(N+v)>>>y|T.i(N+v+1)<<32-y:T.i(N+v);return new o(A,T.h)}r.prototype.digest=r.prototype.v,r.prototype.reset=r.prototype.s,r.prototype.update=r.prototype.u,eC=r,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.A,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=c,o.fromString=d,yi=o}).apply(typeof dw<"u"?dw:typeof self<"u"?self:typeof window<"u"?window:{});var Xl=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var tC,Mo,nC,wu,ep,rC,iC,sC;(function(){var t,e=typeof Object.defineProperties=="function"?Object.defineProperty:function(a,h,f){return a==Array.prototype||a==Object.prototype||(a[h]=f.value),a};function n(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof Xl=="object"&&Xl];for(var h=0;h<a.length;++h){var f=a[h];if(f&&f.Math==Math)return f}throw Error("Cannot find global object")}var r=n(this);function i(a,h){if(h)e:{var f=r;a=a.split(".");for(var _=0;_<a.length-1;_++){var b=a[_];if(!(b in f))break e;f=f[b]}a=a[a.length-1],_=f[a],h=h(_),h!=_&&h!=null&&e(f,a,{configurable:!0,writable:!0,value:h})}}function s(a,h){a instanceof String&&(a+="");var f=0,_=!1,b={next:function(){if(!_&&f<a.length){var M=f++;return{value:h(M,a[M]),done:!1}}return _=!0,{done:!0,value:void 0}}};return b[Symbol.iterator]=function(){return b},b}i("Array.prototype.values",function(a){return a||function(){return s(this,function(h,f){return f})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var o=o||{},l=this||self;function u(a){var h=typeof a;return h=h!="object"?h:a?Array.isArray(a)?"array":h:"null",h=="array"||h=="object"&&typeof a.length=="number"}function c(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function d(a,h,f){return a.call.apply(a.bind,arguments)}function p(a,h,f){if(!a)throw Error();if(2<arguments.length){var _=Array.prototype.slice.call(arguments,2);return function(){var b=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(b,_),a.apply(h,b)}}return function(){return a.apply(h,arguments)}}function m(a,h,f){return m=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?d:p,m.apply(null,arguments)}function E(a,h){var f=Array.prototype.slice.call(arguments,1);return function(){var _=f.slice();return _.push.apply(_,arguments),a.apply(this,_)}}function k(a,h){function f(){}f.prototype=h.prototype,a.aa=h.prototype,a.prototype=new f,a.prototype.constructor=a,a.Qb=function(_,b,M){for(var $=Array(arguments.length-2),ge=2;ge<arguments.length;ge++)$[ge-2]=arguments[ge];return h.prototype[b].apply(_,$)}}function x(a){const h=a.length;if(0<h){const f=Array(h);for(let _=0;_<h;_++)f[_]=a[_];return f}return[]}function P(a,h){for(let f=1;f<arguments.length;f++){const _=arguments[f];if(u(_)){const b=a.length||0,M=_.length||0;a.length=b+M;for(let $=0;$<M;$++)a[b+$]=_[$]}else a.push(_)}}class S{constructor(h,f){this.i=h,this.j=f,this.h=0,this.g=null}get(){let h;return 0<this.h?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function w(a){return/^[\s\xa0]*$/.test(a)}function R(){var a=l.navigator;return a&&(a=a.userAgent)?a:""}function D(a){return D[" "](a),a}D[" "]=function(){};var j=R().indexOf("Gecko")!=-1&&!(R().toLowerCase().indexOf("webkit")!=-1&&R().indexOf("Edge")==-1)&&!(R().indexOf("Trident")!=-1||R().indexOf("MSIE")!=-1)&&R().indexOf("Edge")==-1;function O(a,h,f){for(const _ in a)h.call(f,a[_],_,a)}function T(a,h){for(const f in a)h.call(void 0,a[f],f,a)}function y(a){const h={};for(const f in a)h[f]=a[f];return h}const v="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function I(a,h){let f,_;for(let b=1;b<arguments.length;b++){_=arguments[b];for(f in _)a[f]=_[f];for(let M=0;M<v.length;M++)f=v[M],Object.prototype.hasOwnProperty.call(_,f)&&(a[f]=_[f])}}function A(a){var h=1;a=a.split(":");const f=[];for(;0<h&&a.length;)f.push(a.shift()),h--;return a.length&&f.push(a.join(":")),f}function N(a){l.setTimeout(()=>{throw a},0)}function C(){var a=Y;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class At{constructor(){this.h=this.g=null}add(h,f){const _=bn.get();_.set(h,f),this.h?this.h.next=_:this.g=_,this.h=_}}var bn=new S(()=>new Vt,a=>a.reset());class Vt{constructor(){this.next=this.g=this.h=null}set(h,f){this.h=h,this.g=f,this.next=null}reset(){this.next=this.g=this.h=null}}let Dn,B=!1,Y=new At,ee=()=>{const a=l.Promise.resolve(void 0);Dn=()=>{a.then(Re)}};var Re=()=>{for(var a;a=C();){try{a.h.call(a.g)}catch(f){N(f)}var h=bn;h.j(a),100>h.h&&(h.h++,a.next=h.g,h.g=a)}B=!1};function me(){this.s=this.s,this.C=this.C}me.prototype.s=!1,me.prototype.ma=function(){this.s||(this.s=!0,this.N())},me.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function Le(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}Le.prototype.h=function(){this.defaultPrevented=!0};var Mn=function(){if(!l.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const f=()=>{};l.addEventListener("test",f,h),l.removeEventListener("test",f,h)}catch{}return a}();function On(a,h){if(Le.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a){var f=this.type=a.type,_=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;if(this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget){if(j){e:{try{D(h.nodeName);var b=!0;break e}catch{}b=!1}b||(h=null)}}else f=="mouseover"?h=a.fromElement:f=="mouseout"&&(h=a.toElement);this.relatedTarget=h,_?(this.clientX=_.clientX!==void 0?_.clientX:_.pageX,this.clientY=_.clientY!==void 0?_.clientY:_.pageY,this.screenX=_.screenX||0,this.screenY=_.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=typeof a.pointerType=="string"?a.pointerType:Ln[a.pointerType]||"",this.state=a.state,this.i=a,a.defaultPrevented&&On.aa.h.call(this)}}k(On,Le);var Ln={2:"touch",3:"pen",4:"mouse"};On.prototype.h=function(){On.aa.h.call(this);var a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var Vn="closure_listenable_"+(1e6*Math.random()|0),Ek=0;function Tk(a,h,f,_,b){this.listener=a,this.proxy=null,this.src=h,this.type=f,this.capture=!!_,this.ha=b,this.key=++Ek,this.da=this.fa=!1}function fl(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function pl(a){this.src=a,this.g={},this.h=0}pl.prototype.add=function(a,h,f,_,b){var M=a.toString();a=this.g[M],a||(a=this.g[M]=[],this.h++);var $=wh(a,h,_,b);return-1<$?(h=a[$],f||(h.fa=!1)):(h=new Tk(h,this.src,M,!!_,b),h.fa=f,a.push(h)),h};function vh(a,h){var f=h.type;if(f in a.g){var _=a.g[f],b=Array.prototype.indexOf.call(_,h,void 0),M;(M=0<=b)&&Array.prototype.splice.call(_,b,1),M&&(fl(h),a.g[f].length==0&&(delete a.g[f],a.h--))}}function wh(a,h,f,_){for(var b=0;b<a.length;++b){var M=a[b];if(!M.da&&M.listener==h&&M.capture==!!f&&M.ha==_)return b}return-1}var Eh="closure_lm_"+(1e6*Math.random()|0),Th={};function Bg(a,h,f,_,b){if(Array.isArray(h)){for(var M=0;M<h.length;M++)Bg(a,h[M],f,_,b);return null}return f=Hg(f),a&&a[Vn]?a.K(h,f,c(_)?!!_.capture:!1,b):Ik(a,h,f,!1,_,b)}function Ik(a,h,f,_,b,M){if(!h)throw Error("Invalid event type");var $=c(b)?!!b.capture:!!b,ge=Sh(a);if(ge||(a[Eh]=ge=new pl(a)),f=ge.add(h,f,_,$,M),f.proxy)return f;if(_=Sk(),f.proxy=_,_.src=a,_.listener=f,a.addEventListener)Mn||(b=$),b===void 0&&(b=!1),a.addEventListener(h.toString(),_,b);else if(a.attachEvent)a.attachEvent(Wg(h.toString()),_);else if(a.addListener&&a.removeListener)a.addListener(_);else throw Error("addEventListener and attachEvent are unavailable.");return f}function Sk(){function a(f){return h.call(a.src,a.listener,f)}const h=Ck;return a}function zg(a,h,f,_,b){if(Array.isArray(h))for(var M=0;M<h.length;M++)zg(a,h[M],f,_,b);else _=c(_)?!!_.capture:!!_,f=Hg(f),a&&a[Vn]?(a=a.i,h=String(h).toString(),h in a.g&&(M=a.g[h],f=wh(M,f,_,b),-1<f&&(fl(M[f]),Array.prototype.splice.call(M,f,1),M.length==0&&(delete a.g[h],a.h--)))):a&&(a=Sh(a))&&(h=a.g[h.toString()],a=-1,h&&(a=wh(h,f,_,b)),(f=-1<a?h[a]:null)&&Ih(f))}function Ih(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[Vn])vh(h.i,a);else{var f=a.type,_=a.proxy;h.removeEventListener?h.removeEventListener(f,_,a.capture):h.detachEvent?h.detachEvent(Wg(f),_):h.addListener&&h.removeListener&&h.removeListener(_),(f=Sh(h))?(vh(f,a),f.h==0&&(f.src=null,h[Eh]=null)):fl(a)}}}function Wg(a){return a in Th?Th[a]:Th[a]="on"+a}function Ck(a,h){if(a.da)a=!0;else{h=new On(h,this);var f=a.listener,_=a.ha||a.src;a.fa&&Ih(a),a=f.call(_,h)}return a}function Sh(a){return a=a[Eh],a instanceof pl?a:null}var Ch="__closure_events_fn_"+(1e9*Math.random()>>>0);function Hg(a){return typeof a=="function"?a:(a[Ch]||(a[Ch]=function(h){return a.handleEvent(h)}),a[Ch])}function lt(){me.call(this),this.i=new pl(this),this.M=this,this.F=null}k(lt,me),lt.prototype[Vn]=!0,lt.prototype.removeEventListener=function(a,h,f,_){zg(this,a,h,f,_)};function Et(a,h){var f,_=a.F;if(_)for(f=[];_;_=_.F)f.push(_);if(a=a.M,_=h.type||h,typeof h=="string")h=new Le(h,a);else if(h instanceof Le)h.target=h.target||a;else{var b=h;h=new Le(_,a),I(h,b)}if(b=!0,f)for(var M=f.length-1;0<=M;M--){var $=h.g=f[M];b=ml($,_,!0,h)&&b}if($=h.g=a,b=ml($,_,!0,h)&&b,b=ml($,_,!1,h)&&b,f)for(M=0;M<f.length;M++)$=h.g=f[M],b=ml($,_,!1,h)&&b}lt.prototype.N=function(){if(lt.aa.N.call(this),this.i){var a=this.i,h;for(h in a.g){for(var f=a.g[h],_=0;_<f.length;_++)fl(f[_]);delete a.g[h],a.h--}}this.F=null},lt.prototype.K=function(a,h,f,_){return this.i.add(String(a),h,!1,f,_)},lt.prototype.L=function(a,h,f,_){return this.i.add(String(a),h,!0,f,_)};function ml(a,h,f,_){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();for(var b=!0,M=0;M<h.length;++M){var $=h[M];if($&&!$.da&&$.capture==f){var ge=$.listener,Ze=$.ha||$.src;$.fa&&vh(a.i,$),b=ge.call(Ze,_)!==!1&&b}}return b&&!_.defaultPrevented}function qg(a,h,f){if(typeof a=="function")f&&(a=m(a,f));else if(a&&typeof a.handleEvent=="function")a=m(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<Number(h)?-1:l.setTimeout(a,h||0)}function Gg(a){a.g=qg(()=>{a.g=null,a.i&&(a.i=!1,Gg(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class kk extends me{constructor(h,f){super(),this.m=h,this.l=f,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:Gg(this)}N(){super.N(),this.g&&(l.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function no(a){me.call(this),this.h=a,this.g={}}k(no,me);var Kg=[];function Qg(a){O(a.g,function(h,f){this.g.hasOwnProperty(f)&&Ih(h)},a),a.g={}}no.prototype.N=function(){no.aa.N.call(this),Qg(this)},no.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var kh=l.JSON.stringify,Rk=l.JSON.parse,Ak=class{stringify(a){return l.JSON.stringify(a,void 0)}parse(a){return l.JSON.parse(a,void 0)}};function Rh(){}Rh.prototype.h=null;function Yg(a){return a.h||(a.h=a.i())}function Xg(){}var ro={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function Ah(){Le.call(this,"d")}k(Ah,Le);function Nh(){Le.call(this,"c")}k(Nh,Le);var ei={},Jg=null;function gl(){return Jg=Jg||new lt}ei.La="serverreachability";function Zg(a){Le.call(this,ei.La,a)}k(Zg,Le);function io(a){const h=gl();Et(h,new Zg(h))}ei.STAT_EVENT="statevent";function e_(a,h){Le.call(this,ei.STAT_EVENT,a),this.stat=h}k(e_,Le);function Tt(a){const h=gl();Et(h,new e_(h,a))}ei.Ma="timingevent";function t_(a,h){Le.call(this,ei.Ma,a),this.size=h}k(t_,Le);function so(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return l.setTimeout(function(){a()},h)}function oo(){this.g=!0}oo.prototype.xa=function(){this.g=!1};function Nk(a,h,f,_,b,M){a.info(function(){if(a.g)if(M)for(var $="",ge=M.split("&"),Ze=0;Ze<ge.length;Ze++){var ce=ge[Ze].split("=");if(1<ce.length){var ut=ce[0];ce=ce[1];var ct=ut.split("_");$=2<=ct.length&&ct[1]=="type"?$+(ut+"="+ce+"&"):$+(ut+"=redacted&")}}else $=null;else $=M;return"XMLHTTP REQ ("+_+") [attempt "+b+"]: "+h+`
`+f+`
`+$})}function Pk(a,h,f,_,b,M,$){a.info(function(){return"XMLHTTP RESP ("+_+") [ attempt "+b+"]: "+h+`
`+f+`
`+M+" "+$})}function ji(a,h,f,_){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+bk(a,f)+(_?" "+_:"")})}function xk(a,h){a.info(function(){return"TIMEOUT: "+h})}oo.prototype.info=function(){};function bk(a,h){if(!a.g)return h;if(!h)return null;try{var f=JSON.parse(h);if(f){for(a=0;a<f.length;a++)if(Array.isArray(f[a])){var _=f[a];if(!(2>_.length)){var b=_[1];if(Array.isArray(b)&&!(1>b.length)){var M=b[0];if(M!="noop"&&M!="stop"&&M!="close")for(var $=1;$<b.length;$++)b[$]=""}}}}return kh(f)}catch{return h}}var _l={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},n_={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},Ph;function yl(){}k(yl,Rh),yl.prototype.g=function(){return new XMLHttpRequest},yl.prototype.i=function(){return{}},Ph=new yl;function dr(a,h,f,_){this.j=a,this.i=h,this.l=f,this.R=_||1,this.U=new no(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new r_}function r_(){this.i=null,this.g="",this.h=!1}var i_={},xh={};function bh(a,h,f){a.L=1,a.v=Tl(Fn(h)),a.m=f,a.P=!0,s_(a,null)}function s_(a,h){a.F=Date.now(),vl(a),a.A=Fn(a.v);var f=a.A,_=a.R;Array.isArray(_)||(_=[String(_)]),v_(f.i,"t",_),a.C=0,f=a.j.J,a.h=new r_,a.g=V_(a.j,f?h:null,!a.m),0<a.O&&(a.M=new kk(m(a.Y,a,a.g),a.O)),h=a.U,f=a.g,_=a.ca;var b="readystatechange";Array.isArray(b)||(b&&(Kg[0]=b.toString()),b=Kg);for(var M=0;M<b.length;M++){var $=Bg(f,b[M],_||h.handleEvent,!1,h.h||h);if(!$)break;h.g[$.key]=$}h=a.H?y(a.H):{},a.m?(a.u||(a.u="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.A,a.u,a.m,h)):(a.u="GET",a.g.ea(a.A,a.u,null,h)),io(),Nk(a.i,a.u,a.A,a.l,a.R,a.m)}dr.prototype.ca=function(a){a=a.target;const h=this.M;h&&jn(a)==3?h.j():this.Y(a)},dr.prototype.Y=function(a){try{if(a==this.g)e:{const ct=jn(this.g);var h=this.g.Ba();const Bi=this.g.Z();if(!(3>ct)&&(ct!=3||this.g&&(this.h.h||this.g.oa()||k_(this.g)))){this.J||ct!=4||h==7||(h==8||0>=Bi?io(3):io(2)),Dh(this);var f=this.g.Z();this.X=f;t:if(o_(this)){var _=k_(this.g);a="";var b=_.length,M=jn(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){ti(this),ao(this);var $="";break t}this.h.i=new l.TextDecoder}for(h=0;h<b;h++)this.h.h=!0,a+=this.h.i.decode(_[h],{stream:!(M&&h==b-1)});_.length=0,this.h.g+=a,this.C=0,$=this.h.g}else $=this.g.oa();if(this.o=f==200,Pk(this.i,this.u,this.A,this.l,this.R,ct,f),this.o){if(this.T&&!this.K){t:{if(this.g){var ge,Ze=this.g;if((ge=Ze.g?Ze.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!w(ge)){var ce=ge;break t}}ce=null}if(f=ce)ji(this.i,this.l,f,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,Mh(this,f);else{this.o=!1,this.s=3,Tt(12),ti(this),ao(this);break e}}if(this.P){f=!0;let en;for(;!this.J&&this.C<$.length;)if(en=Dk(this,$),en==xh){ct==4&&(this.s=4,Tt(14),f=!1),ji(this.i,this.l,null,"[Incomplete Response]");break}else if(en==i_){this.s=4,Tt(15),ji(this.i,this.l,$,"[Invalid Chunk]"),f=!1;break}else ji(this.i,this.l,en,null),Mh(this,en);if(o_(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),ct!=4||$.length!=0||this.h.h||(this.s=1,Tt(16),f=!1),this.o=this.o&&f,!f)ji(this.i,this.l,$,"[Invalid Chunked Response]"),ti(this),ao(this);else if(0<$.length&&!this.W){this.W=!0;var ut=this.j;ut.g==this&&ut.ba&&!ut.M&&(ut.j.info("Great, no buffering proxy detected. Bytes received: "+$.length),Uh(ut),ut.M=!0,Tt(11))}}else ji(this.i,this.l,$,null),Mh(this,$);ct==4&&ti(this),this.o&&!this.J&&(ct==4?D_(this.j,this):(this.o=!1,vl(this)))}else Yk(this.g),f==400&&0<$.indexOf("Unknown SID")?(this.s=3,Tt(12)):(this.s=0,Tt(13)),ti(this),ao(this)}}}catch{}finally{}};function o_(a){return a.g?a.u=="GET"&&a.L!=2&&a.j.Ca:!1}function Dk(a,h){var f=a.C,_=h.indexOf(`
`,f);return _==-1?xh:(f=Number(h.substring(f,_)),isNaN(f)?i_:(_+=1,_+f>h.length?xh:(h=h.slice(_,_+f),a.C=_+f,h)))}dr.prototype.cancel=function(){this.J=!0,ti(this)};function vl(a){a.S=Date.now()+a.I,a_(a,a.I)}function a_(a,h){if(a.B!=null)throw Error("WatchDog timer not null");a.B=so(m(a.ba,a),h)}function Dh(a){a.B&&(l.clearTimeout(a.B),a.B=null)}dr.prototype.ba=function(){this.B=null;const a=Date.now();0<=a-this.S?(xk(this.i,this.A),this.L!=2&&(io(),Tt(17)),ti(this),this.s=2,ao(this)):a_(this,this.S-a)};function ao(a){a.j.G==0||a.J||D_(a.j,a)}function ti(a){Dh(a);var h=a.M;h&&typeof h.ma=="function"&&h.ma(),a.M=null,Qg(a.U),a.g&&(h=a.g,a.g=null,h.abort(),h.ma())}function Mh(a,h){try{var f=a.j;if(f.G!=0&&(f.g==a||Oh(f.h,a))){if(!a.K&&Oh(f.h,a)&&f.G==3){try{var _=f.Da.g.parse(h)}catch{_=null}if(Array.isArray(_)&&_.length==3){var b=_;if(b[0]==0){e:if(!f.u){if(f.g)if(f.g.F+3e3<a.F)Al(f),kl(f);else break e;jh(f),Tt(18)}}else f.za=b[1],0<f.za-f.T&&37500>b[2]&&f.F&&f.v==0&&!f.C&&(f.C=so(m(f.Za,f),6e3));if(1>=c_(f.h)&&f.ca){try{f.ca()}catch{}f.ca=void 0}}else ri(f,11)}else if((a.K||f.g==a)&&Al(f),!w(h))for(b=f.Da.g.parse(h),h=0;h<b.length;h++){let ce=b[h];if(f.T=ce[0],ce=ce[1],f.G==2)if(ce[0]=="c"){f.K=ce[1],f.ia=ce[2];const ut=ce[3];ut!=null&&(f.la=ut,f.j.info("VER="+f.la));const ct=ce[4];ct!=null&&(f.Aa=ct,f.j.info("SVER="+f.Aa));const Bi=ce[5];Bi!=null&&typeof Bi=="number"&&0<Bi&&(_=1.5*Bi,f.L=_,f.j.info("backChannelRequestTimeoutMs_="+_)),_=f;const en=a.g;if(en){const Pl=en.g?en.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Pl){var M=_.h;M.g||Pl.indexOf("spdy")==-1&&Pl.indexOf("quic")==-1&&Pl.indexOf("h2")==-1||(M.j=M.l,M.g=new Set,M.h&&(Lh(M,M.h),M.h=null))}if(_.D){const $h=en.g?en.g.getResponseHeader("X-HTTP-Session-Id"):null;$h&&(_.ya=$h,Te(_.I,_.D,$h))}}f.G=3,f.l&&f.l.ua(),f.ba&&(f.R=Date.now()-a.F,f.j.info("Handshake RTT: "+f.R+"ms")),_=f;var $=a;if(_.qa=L_(_,_.J?_.ia:null,_.W),$.K){h_(_.h,$);var ge=$,Ze=_.L;Ze&&(ge.I=Ze),ge.B&&(Dh(ge),vl(ge)),_.g=$}else x_(_);0<f.i.length&&Rl(f)}else ce[0]!="stop"&&ce[0]!="close"||ri(f,7);else f.G==3&&(ce[0]=="stop"||ce[0]=="close"?ce[0]=="stop"?ri(f,7):Fh(f):ce[0]!="noop"&&f.l&&f.l.ta(ce),f.v=0)}}io(4)}catch{}}var Mk=class{constructor(a,h){this.g=a,this.map=h}};function l_(a){this.l=a||10,l.PerformanceNavigationTiming?(a=l.performance.getEntriesByType("navigation"),a=0<a.length&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(l.chrome&&l.chrome.loadTimes&&l.chrome.loadTimes()&&l.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function u_(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function c_(a){return a.h?1:a.g?a.g.size:0}function Oh(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function Lh(a,h){a.g?a.g.add(h):a.h=h}function h_(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}l_.prototype.cancel=function(){if(this.i=d_(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function d_(a){if(a.h!=null)return a.i.concat(a.h.D);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const f of a.g.values())h=h.concat(f.D);return h}return x(a.i)}function Ok(a){if(a.V&&typeof a.V=="function")return a.V();if(typeof Map<"u"&&a instanceof Map||typeof Set<"u"&&a instanceof Set)return Array.from(a.values());if(typeof a=="string")return a.split("");if(u(a)){for(var h=[],f=a.length,_=0;_<f;_++)h.push(a[_]);return h}h=[],f=0;for(_ in a)h[f++]=a[_];return h}function Lk(a){if(a.na&&typeof a.na=="function")return a.na();if(!a.V||typeof a.V!="function"){if(typeof Map<"u"&&a instanceof Map)return Array.from(a.keys());if(!(typeof Set<"u"&&a instanceof Set)){if(u(a)||typeof a=="string"){var h=[];a=a.length;for(var f=0;f<a;f++)h.push(f);return h}h=[],f=0;for(const _ in a)h[f++]=_;return h}}}function f_(a,h){if(a.forEach&&typeof a.forEach=="function")a.forEach(h,void 0);else if(u(a)||typeof a=="string")Array.prototype.forEach.call(a,h,void 0);else for(var f=Lk(a),_=Ok(a),b=_.length,M=0;M<b;M++)h.call(void 0,_[M],f&&f[M],a)}var p_=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Vk(a,h){if(a){a=a.split("&");for(var f=0;f<a.length;f++){var _=a[f].indexOf("="),b=null;if(0<=_){var M=a[f].substring(0,_);b=a[f].substring(_+1)}else M=a[f];h(M,b?decodeURIComponent(b.replace(/\+/g," ")):"")}}}function ni(a){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,a instanceof ni){this.h=a.h,wl(this,a.j),this.o=a.o,this.g=a.g,El(this,a.s),this.l=a.l;var h=a.i,f=new co;f.i=h.i,h.g&&(f.g=new Map(h.g),f.h=h.h),m_(this,f),this.m=a.m}else a&&(h=String(a).match(p_))?(this.h=!1,wl(this,h[1]||"",!0),this.o=lo(h[2]||""),this.g=lo(h[3]||"",!0),El(this,h[4]),this.l=lo(h[5]||"",!0),m_(this,h[6]||"",!0),this.m=lo(h[7]||"")):(this.h=!1,this.i=new co(null,this.h))}ni.prototype.toString=function(){var a=[],h=this.j;h&&a.push(uo(h,g_,!0),":");var f=this.g;return(f||h=="file")&&(a.push("//"),(h=this.o)&&a.push(uo(h,g_,!0),"@"),a.push(encodeURIComponent(String(f)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),f=this.s,f!=null&&a.push(":",String(f))),(f=this.l)&&(this.g&&f.charAt(0)!="/"&&a.push("/"),a.push(uo(f,f.charAt(0)=="/"?Uk:jk,!0))),(f=this.i.toString())&&a.push("?",f),(f=this.m)&&a.push("#",uo(f,Bk)),a.join("")};function Fn(a){return new ni(a)}function wl(a,h,f){a.j=f?lo(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function El(a,h){if(h){if(h=Number(h),isNaN(h)||0>h)throw Error("Bad port number "+h);a.s=h}else a.s=null}function m_(a,h,f){h instanceof co?(a.i=h,zk(a.i,a.h)):(f||(h=uo(h,$k)),a.i=new co(h,a.h))}function Te(a,h,f){a.i.set(h,f)}function Tl(a){return Te(a,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),a}function lo(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function uo(a,h,f){return typeof a=="string"?(a=encodeURI(a).replace(h,Fk),f&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function Fk(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var g_=/[#\/\?@]/g,jk=/[#\?:]/g,Uk=/[#\?]/g,$k=/[#\?@]/g,Bk=/#/g;function co(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function fr(a){a.g||(a.g=new Map,a.h=0,a.i&&Vk(a.i,function(h,f){a.add(decodeURIComponent(h.replace(/\+/g," ")),f)}))}t=co.prototype,t.add=function(a,h){fr(this),this.i=null,a=Ui(this,a);var f=this.g.get(a);return f||this.g.set(a,f=[]),f.push(h),this.h+=1,this};function __(a,h){fr(a),h=Ui(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function y_(a,h){return fr(a),h=Ui(a,h),a.g.has(h)}t.forEach=function(a,h){fr(this),this.g.forEach(function(f,_){f.forEach(function(b){a.call(h,b,_,this)},this)},this)},t.na=function(){fr(this);const a=Array.from(this.g.values()),h=Array.from(this.g.keys()),f=[];for(let _=0;_<h.length;_++){const b=a[_];for(let M=0;M<b.length;M++)f.push(h[_])}return f},t.V=function(a){fr(this);let h=[];if(typeof a=="string")y_(this,a)&&(h=h.concat(this.g.get(Ui(this,a))));else{a=Array.from(this.g.values());for(let f=0;f<a.length;f++)h=h.concat(a[f])}return h},t.set=function(a,h){return fr(this),this.i=null,a=Ui(this,a),y_(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},t.get=function(a,h){return a?(a=this.V(a),0<a.length?String(a[0]):h):h};function v_(a,h,f){__(a,h),0<f.length&&(a.i=null,a.g.set(Ui(a,h),x(f)),a.h+=f.length)}t.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(var f=0;f<h.length;f++){var _=h[f];const M=encodeURIComponent(String(_)),$=this.V(_);for(_=0;_<$.length;_++){var b=M;$[_]!==""&&(b+="="+encodeURIComponent(String($[_]))),a.push(b)}}return this.i=a.join("&")};function Ui(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function zk(a,h){h&&!a.j&&(fr(a),a.i=null,a.g.forEach(function(f,_){var b=_.toLowerCase();_!=b&&(__(this,_),v_(this,b,f))},a)),a.j=h}function Wk(a,h){const f=new oo;if(l.Image){const _=new Image;_.onload=E(pr,f,"TestLoadImage: loaded",!0,h,_),_.onerror=E(pr,f,"TestLoadImage: error",!1,h,_),_.onabort=E(pr,f,"TestLoadImage: abort",!1,h,_),_.ontimeout=E(pr,f,"TestLoadImage: timeout",!1,h,_),l.setTimeout(function(){_.ontimeout&&_.ontimeout()},1e4),_.src=a}else h(!1)}function Hk(a,h){const f=new oo,_=new AbortController,b=setTimeout(()=>{_.abort(),pr(f,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:_.signal}).then(M=>{clearTimeout(b),M.ok?pr(f,"TestPingServer: ok",!0,h):pr(f,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(b),pr(f,"TestPingServer: error",!1,h)})}function pr(a,h,f,_,b){try{b&&(b.onload=null,b.onerror=null,b.onabort=null,b.ontimeout=null),_(f)}catch{}}function qk(){this.g=new Ak}function Gk(a,h,f){const _=f||"";try{f_(a,function(b,M){let $=b;c(b)&&($=kh(b)),h.push(_+M+"="+encodeURIComponent($))})}catch(b){throw h.push(_+"type="+encodeURIComponent("_badmap")),b}}function Il(a){this.l=a.Ub||null,this.j=a.eb||!1}k(Il,Rh),Il.prototype.g=function(){return new Sl(this.l,this.j)},Il.prototype.i=function(a){return function(){return a}}({});function Sl(a,h){lt.call(this),this.D=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}k(Sl,lt),t=Sl.prototype,t.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=a,this.A=h,this.readyState=1,fo(this)},t.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const h={headers:this.u,method:this.B,credentials:this.m,cache:void 0};a&&(h.body=a),(this.D||l).fetch(new Request(this.A,h)).then(this.Sa.bind(this),this.ga.bind(this))},t.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,ho(this)),this.readyState=0},t.Sa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,fo(this)),this.g&&(this.readyState=3,fo(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof l.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;w_(this)}else a.text().then(this.Ra.bind(this),this.ga.bind(this))};function w_(a){a.j.read().then(a.Pa.bind(a)).catch(a.ga.bind(a))}t.Pa=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.v.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?ho(this):fo(this),this.readyState==3&&w_(this)}},t.Ra=function(a){this.g&&(this.response=this.responseText=a,ho(this))},t.Qa=function(a){this.g&&(this.response=a,ho(this))},t.ga=function(){this.g&&ho(this)};function ho(a){a.readyState=4,a.l=null,a.j=null,a.v=null,fo(a)}t.setRequestHeader=function(a,h){this.u.append(a,h)},t.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},t.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var f=h.next();!f.done;)f=f.value,a.push(f[0]+": "+f[1]),f=h.next();return a.join(`\r
`)};function fo(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(Sl.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function E_(a){let h="";return O(a,function(f,_){h+=_,h+=":",h+=f,h+=`\r
`}),h}function Vh(a,h,f){e:{for(_ in f){var _=!1;break e}_=!0}_||(f=E_(f),typeof a=="string"?f!=null&&encodeURIComponent(String(f)):Te(a,h,f))}function be(a){lt.call(this),this.headers=new Map,this.o=a||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}k(be,lt);var Kk=/^https?$/i,Qk=["POST","PUT"];t=be.prototype,t.Ha=function(a){this.J=a},t.ea=function(a,h,f,_){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():Ph.g(),this.v=this.o?Yg(this.o):Yg(Ph),this.g.onreadystatechange=m(this.Ea,this);try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(M){T_(this,M);return}if(a=f||"",f=new Map(this.headers),_)if(Object.getPrototypeOf(_)===Object.prototype)for(var b in _)f.set(b,_[b]);else if(typeof _.keys=="function"&&typeof _.get=="function")for(const M of _.keys())f.set(M,_.get(M));else throw Error("Unknown input type for opt_headers: "+String(_));_=Array.from(f.keys()).find(M=>M.toLowerCase()=="content-type"),b=l.FormData&&a instanceof l.FormData,!(0<=Array.prototype.indexOf.call(Qk,h,void 0))||_||b||f.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[M,$]of f)this.g.setRequestHeader(M,$);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{C_(this),this.u=!0,this.g.send(a),this.u=!1}catch(M){T_(this,M)}};function T_(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.m=5,I_(a),Cl(a)}function I_(a){a.A||(a.A=!0,Et(a,"complete"),Et(a,"error"))}t.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=a||7,Et(this,"complete"),Et(this,"abort"),Cl(this))},t.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Cl(this,!0)),be.aa.N.call(this)},t.Ea=function(){this.s||(this.B||this.u||this.j?S_(this):this.bb())},t.bb=function(){S_(this)};function S_(a){if(a.h&&typeof o<"u"&&(!a.v[1]||jn(a)!=4||a.Z()!=2)){if(a.u&&jn(a)==4)qg(a.Ea,0,a);else if(Et(a,"readystatechange"),jn(a)==4){a.h=!1;try{const $=a.Z();e:switch($){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var f;if(!(f=h)){var _;if(_=$===0){var b=String(a.D).match(p_)[1]||null;!b&&l.self&&l.self.location&&(b=l.self.location.protocol.slice(0,-1)),_=!Kk.test(b?b.toLowerCase():"")}f=_}if(f)Et(a,"complete"),Et(a,"success");else{a.m=6;try{var M=2<jn(a)?a.g.statusText:""}catch{M=""}a.l=M+" ["+a.Z()+"]",I_(a)}}finally{Cl(a)}}}}function Cl(a,h){if(a.g){C_(a);const f=a.g,_=a.v[0]?()=>{}:null;a.g=null,a.v=null,h||Et(a,"ready");try{f.onreadystatechange=_}catch{}}}function C_(a){a.I&&(l.clearTimeout(a.I),a.I=null)}t.isActive=function(){return!!this.g};function jn(a){return a.g?a.g.readyState:0}t.Z=function(){try{return 2<jn(this)?this.g.status:-1}catch{return-1}},t.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},t.Oa=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),Rk(h)}};function k_(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.H){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function Yk(a){const h={};a=(a.g&&2<=jn(a)&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let _=0;_<a.length;_++){if(w(a[_]))continue;var f=A(a[_]);const b=f[0];if(f=f[1],typeof f!="string")continue;f=f.trim();const M=h[b]||[];h[b]=M,M.push(f)}T(h,function(_){return _.join(", ")})}t.Ba=function(){return this.m},t.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function po(a,h,f){return f&&f.internalChannelParams&&f.internalChannelParams[a]||h}function R_(a){this.Aa=0,this.i=[],this.j=new oo,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=po("failFast",!1,a),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=po("baseRetryDelayMs",5e3,a),this.cb=po("retryDelaySeedMs",1e4,a),this.Wa=po("forwardChannelMaxRetries",2,a),this.wa=po("forwardChannelRequestTimeoutMs",2e4,a),this.pa=a&&a.xmlHttpFactory||void 0,this.Xa=a&&a.Tb||void 0,this.Ca=a&&a.useFetchStreams||!1,this.L=void 0,this.J=a&&a.supportsCrossDomainXhr||!1,this.K="",this.h=new l_(a&&a.concurrentRequestLimit),this.Da=new qk,this.P=a&&a.fastHandshake||!1,this.O=a&&a.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=a&&a.Rb||!1,a&&a.xa&&this.j.xa(),a&&a.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&a&&a.detectBufferingProxy||!1,this.ja=void 0,a&&a.longPollingTimeout&&0<a.longPollingTimeout&&(this.ja=a.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}t=R_.prototype,t.la=8,t.G=1,t.connect=function(a,h,f,_){Tt(0),this.W=a,this.H=h||{},f&&_!==void 0&&(this.H.OSID=f,this.H.OAID=_),this.F=this.X,this.I=L_(this,null,this.W),Rl(this)};function Fh(a){if(A_(a),a.G==3){var h=a.U++,f=Fn(a.I);if(Te(f,"SID",a.K),Te(f,"RID",h),Te(f,"TYPE","terminate"),mo(a,f),h=new dr(a,a.j,h),h.L=2,h.v=Tl(Fn(f)),f=!1,l.navigator&&l.navigator.sendBeacon)try{f=l.navigator.sendBeacon(h.v.toString(),"")}catch{}!f&&l.Image&&(new Image().src=h.v,f=!0),f||(h.g=V_(h.j,null),h.g.ea(h.v)),h.F=Date.now(),vl(h)}O_(a)}function kl(a){a.g&&(Uh(a),a.g.cancel(),a.g=null)}function A_(a){kl(a),a.u&&(l.clearTimeout(a.u),a.u=null),Al(a),a.h.cancel(),a.s&&(typeof a.s=="number"&&l.clearTimeout(a.s),a.s=null)}function Rl(a){if(!u_(a.h)&&!a.s){a.s=!0;var h=a.Ga;Dn||ee(),B||(Dn(),B=!0),Y.add(h,a),a.B=0}}function Xk(a,h){return c_(a.h)>=a.h.j-(a.s?1:0)?!1:a.s?(a.i=h.D.concat(a.i),!0):a.G==1||a.G==2||a.B>=(a.Va?0:a.Wa)?!1:(a.s=so(m(a.Ga,a,h),M_(a,a.B)),a.B++,!0)}t.Ga=function(a){if(this.s)if(this.s=null,this.G==1){if(!a){this.U=Math.floor(1e5*Math.random()),a=this.U++;const b=new dr(this,this.j,a);let M=this.o;if(this.S&&(M?(M=y(M),I(M,this.S)):M=this.S),this.m!==null||this.O||(b.H=M,M=null),this.P)e:{for(var h=0,f=0;f<this.i.length;f++){t:{var _=this.i[f];if("__data__"in _.map&&(_=_.map.__data__,typeof _=="string")){_=_.length;break t}_=void 0}if(_===void 0)break;if(h+=_,4096<h){h=f;break e}if(h===4096||f===this.i.length-1){h=f+1;break e}}h=1e3}else h=1e3;h=P_(this,b,h),f=Fn(this.I),Te(f,"RID",a),Te(f,"CVER",22),this.D&&Te(f,"X-HTTP-Session-Id",this.D),mo(this,f),M&&(this.O?h="headers="+encodeURIComponent(String(E_(M)))+"&"+h:this.m&&Vh(f,this.m,M)),Lh(this.h,b),this.Ua&&Te(f,"TYPE","init"),this.P?(Te(f,"$req",h),Te(f,"SID","null"),b.T=!0,bh(b,f,null)):bh(b,f,h),this.G=2}}else this.G==3&&(a?N_(this,a):this.i.length==0||u_(this.h)||N_(this))};function N_(a,h){var f;h?f=h.l:f=a.U++;const _=Fn(a.I);Te(_,"SID",a.K),Te(_,"RID",f),Te(_,"AID",a.T),mo(a,_),a.m&&a.o&&Vh(_,a.m,a.o),f=new dr(a,a.j,f,a.B+1),a.m===null&&(f.H=a.o),h&&(a.i=h.D.concat(a.i)),h=P_(a,f,1e3),f.I=Math.round(.5*a.wa)+Math.round(.5*a.wa*Math.random()),Lh(a.h,f),bh(f,_,h)}function mo(a,h){a.H&&O(a.H,function(f,_){Te(h,_,f)}),a.l&&f_({},function(f,_){Te(h,_,f)})}function P_(a,h,f){f=Math.min(a.i.length,f);var _=a.l?m(a.l.Na,a.l,a):null;e:{var b=a.i;let M=-1;for(;;){const $=["count="+f];M==-1?0<f?(M=b[0].g,$.push("ofs="+M)):M=0:$.push("ofs="+M);let ge=!0;for(let Ze=0;Ze<f;Ze++){let ce=b[Ze].g;const ut=b[Ze].map;if(ce-=M,0>ce)M=Math.max(0,b[Ze].g-100),ge=!1;else try{Gk(ut,$,"req"+ce+"_")}catch{_&&_(ut)}}if(ge){_=$.join("&");break e}}}return a=a.i.splice(0,f),h.D=a,_}function x_(a){if(!a.g&&!a.u){a.Y=1;var h=a.Fa;Dn||ee(),B||(Dn(),B=!0),Y.add(h,a),a.v=0}}function jh(a){return a.g||a.u||3<=a.v?!1:(a.Y++,a.u=so(m(a.Fa,a),M_(a,a.v)),a.v++,!0)}t.Fa=function(){if(this.u=null,b_(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var a=2*this.R;this.j.info("BP detection timer enabled: "+a),this.A=so(m(this.ab,this),a)}},t.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,Tt(10),kl(this),b_(this))};function Uh(a){a.A!=null&&(l.clearTimeout(a.A),a.A=null)}function b_(a){a.g=new dr(a,a.j,"rpc",a.Y),a.m===null&&(a.g.H=a.o),a.g.O=0;var h=Fn(a.qa);Te(h,"RID","rpc"),Te(h,"SID",a.K),Te(h,"AID",a.T),Te(h,"CI",a.F?"0":"1"),!a.F&&a.ja&&Te(h,"TO",a.ja),Te(h,"TYPE","xmlhttp"),mo(a,h),a.m&&a.o&&Vh(h,a.m,a.o),a.L&&(a.g.I=a.L);var f=a.g;a=a.ia,f.L=1,f.v=Tl(Fn(h)),f.m=null,f.P=!0,s_(f,a)}t.Za=function(){this.C!=null&&(this.C=null,kl(this),jh(this),Tt(19))};function Al(a){a.C!=null&&(l.clearTimeout(a.C),a.C=null)}function D_(a,h){var f=null;if(a.g==h){Al(a),Uh(a),a.g=null;var _=2}else if(Oh(a.h,h))f=h.D,h_(a.h,h),_=1;else return;if(a.G!=0){if(h.o)if(_==1){f=h.m?h.m.length:0,h=Date.now()-h.F;var b=a.B;_=gl(),Et(_,new t_(_,f)),Rl(a)}else x_(a);else if(b=h.s,b==3||b==0&&0<h.X||!(_==1&&Xk(a,h)||_==2&&jh(a)))switch(f&&0<f.length&&(h=a.h,h.i=h.i.concat(f)),b){case 1:ri(a,5);break;case 4:ri(a,10);break;case 3:ri(a,6);break;default:ri(a,2)}}}function M_(a,h){let f=a.Ta+Math.floor(Math.random()*a.cb);return a.isActive()||(f*=2),f*h}function ri(a,h){if(a.j.info("Error code "+h),h==2){var f=m(a.fb,a),_=a.Xa;const b=!_;_=new ni(_||"//www.google.com/images/cleardot.gif"),l.location&&l.location.protocol=="http"||wl(_,"https"),Tl(_),b?Wk(_.toString(),f):Hk(_.toString(),f)}else Tt(2);a.G=0,a.l&&a.l.sa(h),O_(a),A_(a)}t.fb=function(a){a?(this.j.info("Successfully pinged google.com"),Tt(2)):(this.j.info("Failed to ping google.com"),Tt(1))};function O_(a){if(a.G=0,a.ka=[],a.l){const h=d_(a.h);(h.length!=0||a.i.length!=0)&&(P(a.ka,h),P(a.ka,a.i),a.h.i.length=0,x(a.i),a.i.length=0),a.l.ra()}}function L_(a,h,f){var _=f instanceof ni?Fn(f):new ni(f);if(_.g!="")h&&(_.g=h+"."+_.g),El(_,_.s);else{var b=l.location;_=b.protocol,h=h?h+"."+b.hostname:b.hostname,b=+b.port;var M=new ni(null);_&&wl(M,_),h&&(M.g=h),b&&El(M,b),f&&(M.l=f),_=M}return f=a.D,h=a.ya,f&&h&&Te(_,f,h),Te(_,"VER",a.la),mo(a,_),_}function V_(a,h,f){if(h&&!a.J)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Ca&&!a.pa?new be(new Il({eb:f})):new be(a.pa),h.Ha(a.J),h}t.isActive=function(){return!!this.l&&this.l.isActive(this)};function F_(){}t=F_.prototype,t.ua=function(){},t.ta=function(){},t.sa=function(){},t.ra=function(){},t.isActive=function(){return!0},t.Na=function(){};function Nl(){}Nl.prototype.g=function(a,h){return new Ft(a,h)};function Ft(a,h){lt.call(this),this.g=new R_(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.va&&(a?a["X-WebChannel-Client-Profile"]=h.va:a={"X-WebChannel-Client-Profile":h.va}),this.g.S=a,(a=h&&h.Sb)&&!w(a)&&(this.g.m=a),this.v=h&&h.supportsCrossDomainXhr||!1,this.u=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!w(h)&&(this.g.D=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new $i(this)}k(Ft,lt),Ft.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},Ft.prototype.close=function(){Fh(this.g)},Ft.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var f={};f.__data__=a,a=f}else this.u&&(f={},f.__data__=kh(a),a=f);h.i.push(new Mk(h.Ya++,a)),h.G==3&&Rl(h)},Ft.prototype.N=function(){this.g.l=null,delete this.j,Fh(this.g),delete this.g,Ft.aa.N.call(this)};function j_(a){Ah.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const f in h){a=f;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}k(j_,Ah);function U_(){Nh.call(this),this.status=1}k(U_,Nh);function $i(a){this.g=a}k($i,F_),$i.prototype.ua=function(){Et(this.g,"a")},$i.prototype.ta=function(a){Et(this.g,new j_(a))},$i.prototype.sa=function(a){Et(this.g,new U_)},$i.prototype.ra=function(){Et(this.g,"b")},Nl.prototype.createWebChannel=Nl.prototype.g,Ft.prototype.send=Ft.prototype.o,Ft.prototype.open=Ft.prototype.m,Ft.prototype.close=Ft.prototype.close,sC=function(){return new Nl},iC=function(){return gl()},rC=ei,ep={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},_l.NO_ERROR=0,_l.TIMEOUT=8,_l.HTTP_ERROR=6,wu=_l,n_.COMPLETE="complete",nC=n_,Xg.EventType=ro,ro.OPEN="a",ro.CLOSE="b",ro.ERROR="c",ro.MESSAGE="d",lt.prototype.listen=lt.prototype.K,Mo=Xg,be.prototype.listenOnce=be.prototype.L,be.prototype.getLastError=be.prototype.Ka,be.prototype.getLastErrorCode=be.prototype.Ba,be.prototype.getStatus=be.prototype.Z,be.prototype.getResponseJson=be.prototype.Oa,be.prototype.getResponseText=be.prototype.oa,be.prototype.send=be.prototype.ea,be.prototype.setWithCredentials=be.prototype.Ha,tC=be}).apply(typeof Xl<"u"?Xl:typeof self<"u"?self:typeof window<"u"?window:{});const fw="@firebase/firestore";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pt{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}pt.UNAUTHENTICATED=new pt(null),pt.GOOGLE_CREDENTIALS=new pt("google-credentials-uid"),pt.FIRST_PARTY=new pt("first-party-uid"),pt.MOCK_USER=new pt("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Js="10.14.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pi=new Qc("@firebase/firestore");function Ao(){return Pi.logLevel}function H(t,...e){if(Pi.logLevel<=ie.DEBUG){const n=e.map(cg);Pi.debug(`Firestore (${Js}): ${t}`,...n)}}function or(t,...e){if(Pi.logLevel<=ie.ERROR){const n=e.map(cg);Pi.error(`Firestore (${Js}): ${t}`,...n)}}function Ms(t,...e){if(Pi.logLevel<=ie.WARN){const n=e.map(cg);Pi.warn(`Firestore (${Js}): ${t}`,...n)}}function cg(t){if(typeof t=="string")return t;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return function(n){return JSON.stringify(n)}(t)}catch{return t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function X(t="Unexpected state"){const e=`FIRESTORE (${Js}) INTERNAL ASSERTION FAILED: `+t;throw or(e),new Error(e)}function pe(t,e){t||X()}function Z(t,e){return t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const V={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class q extends ur{constructor(e,n){super(e,n),this.code=e,this.message=n,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ur{constructor(){this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oC{constructor(e,n){this.user=n,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class mL{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,n){e.enqueueRetryable(()=>n(pt.UNAUTHENTICATED))}shutdown(){}}class gL{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,n){this.changeListener=n,e.enqueueRetryable(()=>n(this.token.user))}shutdown(){this.changeListener=null}}class _L{constructor(e){this.t=e,this.currentUser=pt.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,n){pe(this.o===void 0);let r=this.i;const i=u=>this.i!==r?(r=this.i,n(u)):Promise.resolve();let s=new Ur;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new Ur,e.enqueueRetryable(()=>i(this.currentUser))};const o=()=>{const u=s;e.enqueueRetryable(async()=>{await u.promise,await i(this.currentUser)})},l=u=>{H("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(u=>l(u)),setTimeout(()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?l(u):(H("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new Ur)}},0),o()}getToken(){const e=this.i,n=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(n).then(r=>this.i!==e?(H("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(pe(typeof r.accessToken=="string"),new oC(r.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return pe(e===null||typeof e=="string"),new pt(e)}}class yL{constructor(e,n,r){this.l=e,this.h=n,this.P=r,this.type="FirstParty",this.user=pt.FIRST_PARTY,this.I=new Map}T(){return this.P?this.P():null}get headers(){this.I.set("X-Goog-AuthUser",this.l);const e=this.T();return e&&this.I.set("Authorization",e),this.h&&this.I.set("X-Goog-Iam-Authorization-Token",this.h),this.I}}class vL{constructor(e,n,r){this.l=e,this.h=n,this.P=r}getToken(){return Promise.resolve(new yL(this.l,this.h,this.P))}start(e,n){e.enqueueRetryable(()=>n(pt.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class wL{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class EL{constructor(e){this.A=e,this.forceRefresh=!1,this.appCheck=null,this.R=null}start(e,n){pe(this.o===void 0);const r=s=>{s.error!=null&&H("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const o=s.token!==this.R;return this.R=s.token,H("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?n(s.token):Promise.resolve()};this.o=s=>{e.enqueueRetryable(()=>r(s))};const i=s=>{H("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.A.onInit(s=>i(s)),setTimeout(()=>{if(!this.appCheck){const s=this.A.getImmediate({optional:!0});s?i(s):H("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(n=>n?(pe(typeof n.token=="string"),this.R=n.token,new wL(n.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function TL(t){const e=typeof self<"u"&&(self.crypto||self.msCrypto),n=new Uint8Array(t);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(n);else for(let r=0;r<t;r++)n[r]=Math.floor(256*Math.random());return n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class aC{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=Math.floor(256/e.length)*e.length;let r="";for(;r.length<20;){const i=TL(40);for(let s=0;s<i.length;++s)r.length<20&&i[s]<n&&(r+=e.charAt(i[s]%e.length))}return r}}function he(t,e){return t<e?-1:t>e?1:0}function Os(t,e,n){return t.length===e.length&&t.every((r,i)=>n(r,e[i]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qe{constructor(e,n){if(this.seconds=e,this.nanoseconds=n,n<0)throw new q(V.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(n>=1e9)throw new q(V.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(e<-62135596800)throw new q(V.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new q(V.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}static now(){return qe.fromMillis(Date.now())}static fromDate(e){return qe.fromMillis(e.getTime())}static fromMillis(e){const n=Math.floor(e/1e3),r=Math.floor(1e6*(e-1e3*n));return new qe(n,r)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/1e6}_compareTo(e){return this.seconds===e.seconds?he(this.nanoseconds,e.nanoseconds):he(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{seconds:this.seconds,nanoseconds:this.nanoseconds}}valueOf(){const e=this.seconds- -62135596800;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class J{constructor(e){this.timestamp=e}static fromTimestamp(e){return new J(e)}static min(){return new J(new qe(0,0))}static max(){return new J(new qe(253402300799,999999999))}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oa{constructor(e,n,r){n===void 0?n=0:n>e.length&&X(),r===void 0?r=e.length-n:r>e.length-n&&X(),this.segments=e,this.offset=n,this.len=r}get length(){return this.len}isEqual(e){return Oa.comparator(this,e)===0}child(e){const n=this.segments.slice(this.offset,this.limit());return e instanceof Oa?e.forEach(r=>{n.push(r)}):n.push(e),this.construct(n)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}forEach(e){for(let n=this.offset,r=this.limit();n<r;n++)e(this.segments[n])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,n){const r=Math.min(e.length,n.length);for(let i=0;i<r;i++){const s=e.get(i),o=n.get(i);if(s<o)return-1;if(s>o)return 1}return e.length<n.length?-1:e.length>n.length?1:0}}class Me extends Oa{construct(e,n,r){return new Me(e,n,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const n=[];for(const r of e){if(r.indexOf("//")>=0)throw new q(V.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);n.push(...r.split("/").filter(i=>i.length>0))}return new Me(n)}static emptyPath(){return new Me([])}}const IL=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class nt extends Oa{construct(e,n,r){return new nt(e,n,r)}static isValidIdentifier(e){return IL.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),nt.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)==="__name__"}static keyField(){return new nt(["__name__"])}static fromServerFormat(e){const n=[];let r="",i=0;const s=()=>{if(r.length===0)throw new q(V.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);n.push(r),r=""};let o=!1;for(;i<e.length;){const l=e[i];if(l==="\\"){if(i+1===e.length)throw new q(V.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[i+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new q(V.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=u,i+=2}else l==="`"?(o=!o,i++):l!=="."||o?(r+=l,i++):(s(),i++)}if(s(),o)throw new q(V.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new nt(n)}static emptyPath(){return new nt([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class G{constructor(e){this.path=e}static fromPath(e){return new G(Me.fromString(e))}static fromName(e){return new G(Me.fromString(e).popFirst(5))}static empty(){return new G(Me.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&Me.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,n){return Me.comparator(e.path,n.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new G(new Me(e.slice()))}}function SL(t,e){const n=t.toTimestamp().seconds,r=t.toTimestamp().nanoseconds+1,i=J.fromTimestamp(r===1e9?new qe(n+1,0):new qe(n,r));return new Gr(i,G.empty(),e)}function CL(t){return new Gr(t.readTime,t.key,-1)}class Gr{constructor(e,n,r){this.readTime=e,this.documentKey=n,this.largestBatchId=r}static min(){return new Gr(J.min(),G.empty(),-1)}static max(){return new Gr(J.max(),G.empty(),-1)}}function kL(t,e){let n=t.readTime.compareTo(e.readTime);return n!==0?n:(n=G.comparator(t.documentKey,e.documentKey),n!==0?n:he(t.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const RL="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class AL{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function al(t){if(t.code!==V.FAILED_PRECONDITION||t.message!==RL)throw t;H("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class L{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(n=>{this.isDone=!0,this.result=n,this.nextCallback&&this.nextCallback(n)},n=>{this.isDone=!0,this.error=n,this.catchCallback&&this.catchCallback(n)})}catch(e){return this.next(void 0,e)}next(e,n){return this.callbackAttached&&X(),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(n,this.error):this.wrapSuccess(e,this.result):new L((r,i)=>{this.nextCallback=s=>{this.wrapSuccess(e,s).next(r,i)},this.catchCallback=s=>{this.wrapFailure(n,s).next(r,i)}})}toPromise(){return new Promise((e,n)=>{this.next(e,n)})}wrapUserFunction(e){try{const n=e();return n instanceof L?n:L.resolve(n)}catch(n){return L.reject(n)}}wrapSuccess(e,n){return e?this.wrapUserFunction(()=>e(n)):L.resolve(n)}wrapFailure(e,n){return e?this.wrapUserFunction(()=>e(n)):L.reject(n)}static resolve(e){return new L((n,r)=>{n(e)})}static reject(e){return new L((n,r)=>{r(e)})}static waitFor(e){return new L((n,r)=>{let i=0,s=0,o=!1;e.forEach(l=>{++i,l.next(()=>{++s,o&&s===i&&n()},u=>r(u))}),o=!0,s===i&&n()})}static or(e){let n=L.resolve(!1);for(const r of e)n=n.next(i=>i?L.resolve(i):r());return n}static forEach(e,n){const r=[];return e.forEach((i,s)=>{r.push(n.call(this,i,s))}),this.waitFor(r)}static mapArray(e,n){return new L((r,i)=>{const s=e.length,o=new Array(s);let l=0;for(let u=0;u<s;u++){const c=u;n(e[c]).next(d=>{o[c]=d,++l,l===s&&r(o)},d=>i(d))}})}static doWhile(e,n){return new L((r,i)=>{const s=()=>{e()===!0?n().next(()=>{s()},i):r()};s()})}}function NL(t){const e=t.match(/Android ([\d.]+)/i),n=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(n)}function ll(t){return t.name==="IndexedDbTransactionError"}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hg{constructor(e,n){this.previousValue=e,n&&(n.sequenceNumberHandler=r=>this.ie(r),this.se=r=>n.writeSequenceNumber(r))}ie(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.se&&this.se(e),e}}hg.oe=-1;function uh(t){return t==null}function _c(t){return t===0&&1/t==-1/0}function PL(t){return typeof t=="number"&&Number.isInteger(t)&&!_c(t)&&t<=Number.MAX_SAFE_INTEGER&&t>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pw(t){let e=0;for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e++;return e}function Zs(t,e){for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e(n,t[n])}function lC(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xe{constructor(e,n){this.comparator=e,this.root=n||tt.EMPTY}insert(e,n){return new xe(this.comparator,this.root.insert(e,n,this.comparator).copy(null,null,tt.BLACK,null,null))}remove(e){return new xe(this.comparator,this.root.remove(e,this.comparator).copy(null,null,tt.BLACK,null,null))}get(e){let n=this.root;for(;!n.isEmpty();){const r=this.comparator(e,n.key);if(r===0)return n.value;r<0?n=n.left:r>0&&(n=n.right)}return null}indexOf(e){let n=0,r=this.root;for(;!r.isEmpty();){const i=this.comparator(e,r.key);if(i===0)return n+r.left.size;i<0?r=r.left:(n+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((n,r)=>(e(n,r),!1))}toString(){const e=[];return this.inorderTraversal((n,r)=>(e.push(`${n}:${r}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new Jl(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new Jl(this.root,e,this.comparator,!1)}getReverseIterator(){return new Jl(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new Jl(this.root,e,this.comparator,!0)}}class Jl{constructor(e,n,r,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=n?r(e.key,n):1,n&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const n={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return n}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class tt{constructor(e,n,r,i,s){this.key=e,this.value=n,this.color=r??tt.RED,this.left=i??tt.EMPTY,this.right=s??tt.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,n,r,i,s){return new tt(e??this.key,n??this.value,r??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,n,r){let i=this;const s=r(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,n,r),null):s===0?i.copy(null,n,null,null,null):i.copy(null,null,null,null,i.right.insert(e,n,r)),i.fixUp()}removeMin(){if(this.left.isEmpty())return tt.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,n){let r,i=this;if(n(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,n),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),n(e,i.key)===0){if(i.right.isEmpty())return tt.EMPTY;r=i.right.min(),i=i.copy(r.key,r.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,n))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,tt.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,tt.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),n=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,n)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed()||this.right.isRed())throw X();const e=this.left.check();if(e!==this.right.check())throw X();return e+(this.isRed()?0:1)}}tt.EMPTY=null,tt.RED=!0,tt.BLACK=!1;tt.EMPTY=new class{constructor(){this.size=0}get key(){throw X()}get value(){throw X()}get color(){throw X()}get left(){throw X()}get right(){throw X()}copy(e,n,r,i,s){return this}insert(e,n,r){return new tt(e,n)}remove(e,n){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class it{constructor(e){this.comparator=e,this.data=new xe(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((n,r)=>(e(n),!1))}forEachInRange(e,n){const r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){const i=r.getNext();if(this.comparator(i.key,e[1])>=0)return;n(i.key)}}forEachWhile(e,n){let r;for(r=n!==void 0?this.data.getIteratorFrom(n):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){const n=this.data.getIteratorFrom(e);return n.hasNext()?n.getNext().key:null}getIterator(){return new mw(this.data.getIterator())}getIteratorFrom(e){return new mw(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let n=this;return n.size<e.size&&(n=e,e=this),e.forEach(r=>{n=n.add(r)}),n}isEqual(e){if(!(e instanceof it)||this.size!==e.size)return!1;const n=this.data.getIterator(),r=e.data.getIterator();for(;n.hasNext();){const i=n.getNext().key,s=r.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(n=>{e.push(n)}),e}toString(){const e=[];return this.forEach(n=>e.push(n)),"SortedSet("+e.toString()+")"}copy(e){const n=new it(this.comparator);return n.data=e,n}}class mw{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class un{constructor(e){this.fields=e,e.sort(nt.comparator)}static empty(){return new un([])}unionWith(e){let n=new it(nt.comparator);for(const r of this.fields)n=n.add(r);for(const r of e)n=n.add(r);return new un(n.toArray())}covers(e){for(const n of this.fields)if(n.isPrefixOf(e))return!0;return!1}isEqual(e){return Os(this.fields,e.fields,(n,r)=>n.isEqual(r))}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uC extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class at{constructor(e){this.binaryString=e}static fromBase64String(e){const n=function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new uC("Invalid base64 string: "+s):s}}(e);return new at(n)}static fromUint8Array(e){const n=function(i){let s="";for(let o=0;o<i.length;++o)s+=String.fromCharCode(i[o]);return s}(e);return new at(n)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(n){return btoa(n)}(this.binaryString)}toUint8Array(){return function(n){const r=new Uint8Array(n.length);for(let i=0;i<n.length;i++)r[i]=n.charCodeAt(i);return r}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return he(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}at.EMPTY_BYTE_STRING=new at("");const xL=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Kr(t){if(pe(!!t),typeof t=="string"){let e=0;const n=xL.exec(t);if(pe(!!n),n[1]){let i=n[1];i=(i+"000000000").substr(0,9),e=Number(i)}const r=new Date(t);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:Ve(t.seconds),nanos:Ve(t.nanos)}}function Ve(t){return typeof t=="number"?t:typeof t=="string"?Number(t):0}function xi(t){return typeof t=="string"?at.fromBase64String(t):at.fromUint8Array(t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dg(t){var e,n;return((n=(((e=t==null?void 0:t.mapValue)===null||e===void 0?void 0:e.fields)||{}).__type__)===null||n===void 0?void 0:n.stringValue)==="server_timestamp"}function fg(t){const e=t.mapValue.fields.__previous_value__;return dg(e)?fg(e):e}function La(t){const e=Kr(t.mapValue.fields.__local_write_time__.timestampValue);return new qe(e.seconds,e.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bL{constructor(e,n,r,i,s,o,l,u,c){this.databaseId=e,this.appId=n,this.persistenceKey=r,this.host=i,this.ssl=s,this.forceLongPolling=o,this.autoDetectLongPolling=l,this.longPollingOptions=u,this.useFetchStreams=c}}class Va{constructor(e,n){this.projectId=e,this.database=n||"(default)"}static empty(){return new Va("","")}get isDefaultDatabase(){return this.database==="(default)"}isEqual(e){return e instanceof Va&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zl={mapValue:{}};function bi(t){return"nullValue"in t?0:"booleanValue"in t?1:"integerValue"in t||"doubleValue"in t?2:"timestampValue"in t?3:"stringValue"in t?5:"bytesValue"in t?6:"referenceValue"in t?7:"geoPointValue"in t?8:"arrayValue"in t?9:"mapValue"in t?dg(t)?4:ML(t)?9007199254740991:DL(t)?10:11:X()}function Pn(t,e){if(t===e)return!0;const n=bi(t);if(n!==bi(e))return!1;switch(n){case 0:case 9007199254740991:return!0;case 1:return t.booleanValue===e.booleanValue;case 4:return La(t).isEqual(La(e));case 3:return function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const o=Kr(i.timestampValue),l=Kr(s.timestampValue);return o.seconds===l.seconds&&o.nanos===l.nanos}(t,e);case 5:return t.stringValue===e.stringValue;case 6:return function(i,s){return xi(i.bytesValue).isEqual(xi(s.bytesValue))}(t,e);case 7:return t.referenceValue===e.referenceValue;case 8:return function(i,s){return Ve(i.geoPointValue.latitude)===Ve(s.geoPointValue.latitude)&&Ve(i.geoPointValue.longitude)===Ve(s.geoPointValue.longitude)}(t,e);case 2:return function(i,s){if("integerValue"in i&&"integerValue"in s)return Ve(i.integerValue)===Ve(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const o=Ve(i.doubleValue),l=Ve(s.doubleValue);return o===l?_c(o)===_c(l):isNaN(o)&&isNaN(l)}return!1}(t,e);case 9:return Os(t.arrayValue.values||[],e.arrayValue.values||[],Pn);case 10:case 11:return function(i,s){const o=i.mapValue.fields||{},l=s.mapValue.fields||{};if(pw(o)!==pw(l))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(l[u]===void 0||!Pn(o[u],l[u])))return!1;return!0}(t,e);default:return X()}}function Fa(t,e){return(t.values||[]).find(n=>Pn(n,e))!==void 0}function Ls(t,e){if(t===e)return 0;const n=bi(t),r=bi(e);if(n!==r)return he(n,r);switch(n){case 0:case 9007199254740991:return 0;case 1:return he(t.booleanValue,e.booleanValue);case 2:return function(s,o){const l=Ve(s.integerValue||s.doubleValue),u=Ve(o.integerValue||o.doubleValue);return l<u?-1:l>u?1:l===u?0:isNaN(l)?isNaN(u)?0:-1:1}(t,e);case 3:return gw(t.timestampValue,e.timestampValue);case 4:return gw(La(t),La(e));case 5:return he(t.stringValue,e.stringValue);case 6:return function(s,o){const l=xi(s),u=xi(o);return l.compareTo(u)}(t.bytesValue,e.bytesValue);case 7:return function(s,o){const l=s.split("/"),u=o.split("/");for(let c=0;c<l.length&&c<u.length;c++){const d=he(l[c],u[c]);if(d!==0)return d}return he(l.length,u.length)}(t.referenceValue,e.referenceValue);case 8:return function(s,o){const l=he(Ve(s.latitude),Ve(o.latitude));return l!==0?l:he(Ve(s.longitude),Ve(o.longitude))}(t.geoPointValue,e.geoPointValue);case 9:return _w(t.arrayValue,e.arrayValue);case 10:return function(s,o){var l,u,c,d;const p=s.fields||{},m=o.fields||{},E=(l=p.value)===null||l===void 0?void 0:l.arrayValue,k=(u=m.value)===null||u===void 0?void 0:u.arrayValue,x=he(((c=E==null?void 0:E.values)===null||c===void 0?void 0:c.length)||0,((d=k==null?void 0:k.values)===null||d===void 0?void 0:d.length)||0);return x!==0?x:_w(E,k)}(t.mapValue,e.mapValue);case 11:return function(s,o){if(s===Zl.mapValue&&o===Zl.mapValue)return 0;if(s===Zl.mapValue)return 1;if(o===Zl.mapValue)return-1;const l=s.fields||{},u=Object.keys(l),c=o.fields||{},d=Object.keys(c);u.sort(),d.sort();for(let p=0;p<u.length&&p<d.length;++p){const m=he(u[p],d[p]);if(m!==0)return m;const E=Ls(l[u[p]],c[d[p]]);if(E!==0)return E}return he(u.length,d.length)}(t.mapValue,e.mapValue);default:throw X()}}function gw(t,e){if(typeof t=="string"&&typeof e=="string"&&t.length===e.length)return he(t,e);const n=Kr(t),r=Kr(e),i=he(n.seconds,r.seconds);return i!==0?i:he(n.nanos,r.nanos)}function _w(t,e){const n=t.values||[],r=e.values||[];for(let i=0;i<n.length&&i<r.length;++i){const s=Ls(n[i],r[i]);if(s)return s}return he(n.length,r.length)}function Vs(t){return tp(t)}function tp(t){return"nullValue"in t?"null":"booleanValue"in t?""+t.booleanValue:"integerValue"in t?""+t.integerValue:"doubleValue"in t?""+t.doubleValue:"timestampValue"in t?function(n){const r=Kr(n);return`time(${r.seconds},${r.nanos})`}(t.timestampValue):"stringValue"in t?t.stringValue:"bytesValue"in t?function(n){return xi(n).toBase64()}(t.bytesValue):"referenceValue"in t?function(n){return G.fromName(n).toString()}(t.referenceValue):"geoPointValue"in t?function(n){return`geo(${n.latitude},${n.longitude})`}(t.geoPointValue):"arrayValue"in t?function(n){let r="[",i=!0;for(const s of n.values||[])i?i=!1:r+=",",r+=tp(s);return r+"]"}(t.arrayValue):"mapValue"in t?function(n){const r=Object.keys(n.fields||{}).sort();let i="{",s=!0;for(const o of r)s?s=!1:i+=",",i+=`${o}:${tp(n.fields[o])}`;return i+"}"}(t.mapValue):X()}function np(t){return!!t&&"integerValue"in t}function pg(t){return!!t&&"arrayValue"in t}function yw(t){return!!t&&"nullValue"in t}function vw(t){return!!t&&"doubleValue"in t&&isNaN(Number(t.doubleValue))}function Eu(t){return!!t&&"mapValue"in t}function DL(t){var e,n;return((n=(((e=t==null?void 0:t.mapValue)===null||e===void 0?void 0:e.fields)||{}).__type__)===null||n===void 0?void 0:n.stringValue)==="__vector__"}function ea(t){if(t.geoPointValue)return{geoPointValue:Object.assign({},t.geoPointValue)};if(t.timestampValue&&typeof t.timestampValue=="object")return{timestampValue:Object.assign({},t.timestampValue)};if(t.mapValue){const e={mapValue:{fields:{}}};return Zs(t.mapValue.fields,(n,r)=>e.mapValue.fields[n]=ea(r)),e}if(t.arrayValue){const e={arrayValue:{values:[]}};for(let n=0;n<(t.arrayValue.values||[]).length;++n)e.arrayValue.values[n]=ea(t.arrayValue.values[n]);return e}return Object.assign({},t)}function ML(t){return(((t.mapValue||{}).fields||{}).__type__||{}).stringValue==="__max__"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kt{constructor(e){this.value=e}static empty(){return new Kt({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let n=this.value;for(let r=0;r<e.length-1;++r)if(n=(n.mapValue.fields||{})[e.get(r)],!Eu(n))return null;return n=(n.mapValue.fields||{})[e.lastSegment()],n||null}}set(e,n){this.getFieldsMap(e.popLast())[e.lastSegment()]=ea(n)}setAll(e){let n=nt.emptyPath(),r={},i=[];e.forEach((o,l)=>{if(!n.isImmediateParentOf(l)){const u=this.getFieldsMap(n);this.applyChanges(u,r,i),r={},i=[],n=l.popLast()}o?r[l.lastSegment()]=ea(o):i.push(l.lastSegment())});const s=this.getFieldsMap(n);this.applyChanges(s,r,i)}delete(e){const n=this.field(e.popLast());Eu(n)&&n.mapValue.fields&&delete n.mapValue.fields[e.lastSegment()]}isEqual(e){return Pn(this.value,e.value)}getFieldsMap(e){let n=this.value;n.mapValue.fields||(n.mapValue={fields:{}});for(let r=0;r<e.length;++r){let i=n.mapValue.fields[e.get(r)];Eu(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},n.mapValue.fields[e.get(r)]=i),n=i}return n.mapValue.fields}applyChanges(e,n,r){Zs(n,(i,s)=>e[i]=s);for(const i of r)delete e[i]}clone(){return new Kt(ea(this.value))}}function cC(t){const e=[];return Zs(t.fields,(n,r)=>{const i=new nt([n]);if(Eu(r)){const s=cC(r.mapValue).fields;if(s.length===0)e.push(i);else for(const o of s)e.push(i.child(o))}else e.push(i)}),new un(e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _t{constructor(e,n,r,i,s,o,l){this.key=e,this.documentType=n,this.version=r,this.readTime=i,this.createTime=s,this.data=o,this.documentState=l}static newInvalidDocument(e){return new _t(e,0,J.min(),J.min(),J.min(),Kt.empty(),0)}static newFoundDocument(e,n,r,i){return new _t(e,1,n,J.min(),r,i,0)}static newNoDocument(e,n){return new _t(e,2,n,J.min(),J.min(),Kt.empty(),0)}static newUnknownDocument(e,n){return new _t(e,3,n,J.min(),J.min(),Kt.empty(),2)}convertToFoundDocument(e,n){return!this.createTime.isEqual(J.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=n,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Kt.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Kt.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=J.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof _t&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new _t(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yc{constructor(e,n){this.position=e,this.inclusive=n}}function ww(t,e,n){let r=0;for(let i=0;i<t.position.length;i++){const s=e[i],o=t.position[i];if(s.field.isKeyField()?r=G.comparator(G.fromName(o.referenceValue),n.key):r=Ls(o,n.data.field(s.field)),s.dir==="desc"&&(r*=-1),r!==0)break}return r}function Ew(t,e){if(t===null)return e===null;if(e===null||t.inclusive!==e.inclusive||t.position.length!==e.position.length)return!1;for(let n=0;n<t.position.length;n++)if(!Pn(t.position[n],e.position[n]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vc{constructor(e,n="asc"){this.field=e,this.dir=n}}function OL(t,e){return t.dir===e.dir&&t.field.isEqual(e.field)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hC{}class We extends hC{constructor(e,n,r){super(),this.field=e,this.op=n,this.value=r}static create(e,n,r){return e.isKeyField()?n==="in"||n==="not-in"?this.createKeyFieldInFilter(e,n,r):new VL(e,n,r):n==="array-contains"?new UL(e,r):n==="in"?new $L(e,r):n==="not-in"?new BL(e,r):n==="array-contains-any"?new zL(e,r):new We(e,n,r)}static createKeyFieldInFilter(e,n,r){return n==="in"?new FL(e,r):new jL(e,r)}matches(e){const n=e.data.field(this.field);return this.op==="!="?n!==null&&this.matchesComparison(Ls(n,this.value)):n!==null&&bi(this.value)===bi(n)&&this.matchesComparison(Ls(n,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return X()}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class xn extends hC{constructor(e,n){super(),this.filters=e,this.op=n,this.ae=null}static create(e,n){return new xn(e,n)}matches(e){return dC(this)?this.filters.find(n=>!n.matches(e))===void 0:this.filters.find(n=>n.matches(e))!==void 0}getFlattenedFilters(){return this.ae!==null||(this.ae=this.filters.reduce((e,n)=>e.concat(n.getFlattenedFilters()),[])),this.ae}getFilters(){return Object.assign([],this.filters)}}function dC(t){return t.op==="and"}function fC(t){return LL(t)&&dC(t)}function LL(t){for(const e of t.filters)if(e instanceof xn)return!1;return!0}function rp(t){if(t instanceof We)return t.field.canonicalString()+t.op.toString()+Vs(t.value);if(fC(t))return t.filters.map(e=>rp(e)).join(",");{const e=t.filters.map(n=>rp(n)).join(",");return`${t.op}(${e})`}}function pC(t,e){return t instanceof We?function(r,i){return i instanceof We&&r.op===i.op&&r.field.isEqual(i.field)&&Pn(r.value,i.value)}(t,e):t instanceof xn?function(r,i){return i instanceof xn&&r.op===i.op&&r.filters.length===i.filters.length?r.filters.reduce((s,o,l)=>s&&pC(o,i.filters[l]),!0):!1}(t,e):void X()}function mC(t){return t instanceof We?function(n){return`${n.field.canonicalString()} ${n.op} ${Vs(n.value)}`}(t):t instanceof xn?function(n){return n.op.toString()+" {"+n.getFilters().map(mC).join(" ,")+"}"}(t):"Filter"}class VL extends We{constructor(e,n,r){super(e,n,r),this.key=G.fromName(r.referenceValue)}matches(e){const n=G.comparator(e.key,this.key);return this.matchesComparison(n)}}class FL extends We{constructor(e,n){super(e,"in",n),this.keys=gC("in",n)}matches(e){return this.keys.some(n=>n.isEqual(e.key))}}class jL extends We{constructor(e,n){super(e,"not-in",n),this.keys=gC("not-in",n)}matches(e){return!this.keys.some(n=>n.isEqual(e.key))}}function gC(t,e){var n;return(((n=e.arrayValue)===null||n===void 0?void 0:n.values)||[]).map(r=>G.fromName(r.referenceValue))}class UL extends We{constructor(e,n){super(e,"array-contains",n)}matches(e){const n=e.data.field(this.field);return pg(n)&&Fa(n.arrayValue,this.value)}}class $L extends We{constructor(e,n){super(e,"in",n)}matches(e){const n=e.data.field(this.field);return n!==null&&Fa(this.value.arrayValue,n)}}class BL extends We{constructor(e,n){super(e,"not-in",n)}matches(e){if(Fa(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const n=e.data.field(this.field);return n!==null&&!Fa(this.value.arrayValue,n)}}class zL extends We{constructor(e,n){super(e,"array-contains-any",n)}matches(e){const n=e.data.field(this.field);return!(!pg(n)||!n.arrayValue.values)&&n.arrayValue.values.some(r=>Fa(this.value.arrayValue,r))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class WL{constructor(e,n=null,r=[],i=[],s=null,o=null,l=null){this.path=e,this.collectionGroup=n,this.orderBy=r,this.filters=i,this.limit=s,this.startAt=o,this.endAt=l,this.ue=null}}function Tw(t,e=null,n=[],r=[],i=null,s=null,o=null){return new WL(t,e,n,r,i,s,o)}function mg(t){const e=Z(t);if(e.ue===null){let n=e.path.canonicalString();e.collectionGroup!==null&&(n+="|cg:"+e.collectionGroup),n+="|f:",n+=e.filters.map(r=>rp(r)).join(","),n+="|ob:",n+=e.orderBy.map(r=>function(s){return s.field.canonicalString()+s.dir}(r)).join(","),uh(e.limit)||(n+="|l:",n+=e.limit),e.startAt&&(n+="|lb:",n+=e.startAt.inclusive?"b:":"a:",n+=e.startAt.position.map(r=>Vs(r)).join(",")),e.endAt&&(n+="|ub:",n+=e.endAt.inclusive?"a:":"b:",n+=e.endAt.position.map(r=>Vs(r)).join(",")),e.ue=n}return e.ue}function gg(t,e){if(t.limit!==e.limit||t.orderBy.length!==e.orderBy.length)return!1;for(let n=0;n<t.orderBy.length;n++)if(!OL(t.orderBy[n],e.orderBy[n]))return!1;if(t.filters.length!==e.filters.length)return!1;for(let n=0;n<t.filters.length;n++)if(!pC(t.filters[n],e.filters[n]))return!1;return t.collectionGroup===e.collectionGroup&&!!t.path.isEqual(e.path)&&!!Ew(t.startAt,e.startAt)&&Ew(t.endAt,e.endAt)}function ip(t){return G.isDocumentKey(t.path)&&t.collectionGroup===null&&t.filters.length===0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ch{constructor(e,n=null,r=[],i=[],s=null,o="F",l=null,u=null){this.path=e,this.collectionGroup=n,this.explicitOrderBy=r,this.filters=i,this.limit=s,this.limitType=o,this.startAt=l,this.endAt=u,this.ce=null,this.le=null,this.he=null,this.startAt,this.endAt}}function HL(t,e,n,r,i,s,o,l){return new ch(t,e,n,r,i,s,o,l)}function _g(t){return new ch(t)}function Iw(t){return t.filters.length===0&&t.limit===null&&t.startAt==null&&t.endAt==null&&(t.explicitOrderBy.length===0||t.explicitOrderBy.length===1&&t.explicitOrderBy[0].field.isKeyField())}function qL(t){return t.collectionGroup!==null}function ta(t){const e=Z(t);if(e.ce===null){e.ce=[];const n=new Set;for(const s of e.explicitOrderBy)e.ce.push(s),n.add(s.field.canonicalString());const r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let l=new it(nt.comparator);return o.filters.forEach(u=>{u.getFlattenedFilters().forEach(c=>{c.isInequality()&&(l=l.add(c.field))})}),l})(e).forEach(s=>{n.has(s.canonicalString())||s.isKeyField()||e.ce.push(new vc(s,r))}),n.has(nt.keyField().canonicalString())||e.ce.push(new vc(nt.keyField(),r))}return e.ce}function kn(t){const e=Z(t);return e.le||(e.le=GL(e,ta(t))),e.le}function GL(t,e){if(t.limitType==="F")return Tw(t.path,t.collectionGroup,e,t.filters,t.limit,t.startAt,t.endAt);{e=e.map(i=>{const s=i.dir==="desc"?"asc":"desc";return new vc(i.field,s)});const n=t.endAt?new yc(t.endAt.position,t.endAt.inclusive):null,r=t.startAt?new yc(t.startAt.position,t.startAt.inclusive):null;return Tw(t.path,t.collectionGroup,e,t.filters,t.limit,n,r)}}function sp(t,e,n){return new ch(t.path,t.collectionGroup,t.explicitOrderBy.slice(),t.filters.slice(),e,n,t.startAt,t.endAt)}function hh(t,e){return gg(kn(t),kn(e))&&t.limitType===e.limitType}function _C(t){return`${mg(kn(t))}|lt:${t.limitType}`}function Hi(t){return`Query(target=${function(n){let r=n.path.canonicalString();return n.collectionGroup!==null&&(r+=" collectionGroup="+n.collectionGroup),n.filters.length>0&&(r+=`, filters: [${n.filters.map(i=>mC(i)).join(", ")}]`),uh(n.limit)||(r+=", limit: "+n.limit),n.orderBy.length>0&&(r+=`, orderBy: [${n.orderBy.map(i=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(i)).join(", ")}]`),n.startAt&&(r+=", startAt: ",r+=n.startAt.inclusive?"b:":"a:",r+=n.startAt.position.map(i=>Vs(i)).join(",")),n.endAt&&(r+=", endAt: ",r+=n.endAt.inclusive?"a:":"b:",r+=n.endAt.position.map(i=>Vs(i)).join(",")),`Target(${r})`}(kn(t))}; limitType=${t.limitType})`}function dh(t,e){return e.isFoundDocument()&&function(r,i){const s=i.key.path;return r.collectionGroup!==null?i.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(s):G.isDocumentKey(r.path)?r.path.isEqual(s):r.path.isImmediateParentOf(s)}(t,e)&&function(r,i){for(const s of ta(r))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0}(t,e)&&function(r,i){for(const s of r.filters)if(!s.matches(i))return!1;return!0}(t,e)&&function(r,i){return!(r.startAt&&!function(o,l,u){const c=ww(o,l,u);return o.inclusive?c<=0:c<0}(r.startAt,ta(r),i)||r.endAt&&!function(o,l,u){const c=ww(o,l,u);return o.inclusive?c>=0:c>0}(r.endAt,ta(r),i))}(t,e)}function KL(t){return t.collectionGroup||(t.path.length%2==1?t.path.lastSegment():t.path.get(t.path.length-2))}function yC(t){return(e,n)=>{let r=!1;for(const i of ta(t)){const s=QL(i,e,n);if(s!==0)return s;r=r||i.field.isKeyField()}return 0}}function QL(t,e,n){const r=t.field.isKeyField()?G.comparator(e.key,n.key):function(s,o,l){const u=o.data.field(s),c=l.data.field(s);return u!==null&&c!==null?Ls(u,c):X()}(t.field,e,n);switch(t.dir){case"asc":return r;case"desc":return-1*r;default:return X()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eo{constructor(e,n){this.mapKeyFn=e,this.equalsFn=n,this.inner={},this.innerSize=0}get(e){const n=this.mapKeyFn(e),r=this.inner[n];if(r!==void 0){for(const[i,s]of r)if(this.equalsFn(i,e))return s}}has(e){return this.get(e)!==void 0}set(e,n){const r=this.mapKeyFn(e),i=this.inner[r];if(i===void 0)return this.inner[r]=[[e,n]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],e))return void(i[s]=[e,n]);i.push([e,n]),this.innerSize++}delete(e){const n=this.mapKeyFn(e),r=this.inner[n];if(r===void 0)return!1;for(let i=0;i<r.length;i++)if(this.equalsFn(r[i][0],e))return r.length===1?delete this.inner[n]:r.splice(i,1),this.innerSize--,!0;return!1}forEach(e){Zs(this.inner,(n,r)=>{for(const[i,s]of r)e(i,s)})}isEmpty(){return lC(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const YL=new xe(G.comparator);function ar(){return YL}const vC=new xe(G.comparator);function Oo(...t){let e=vC;for(const n of t)e=e.insert(n.key,n);return e}function wC(t){let e=vC;return t.forEach((n,r)=>e=e.insert(n,r.overlayedDocument)),e}function pi(){return na()}function EC(){return na()}function na(){return new eo(t=>t.toString(),(t,e)=>t.isEqual(e))}const XL=new xe(G.comparator),JL=new it(G.comparator);function oe(...t){let e=JL;for(const n of t)e=e.add(n);return e}const ZL=new it(he);function e2(){return ZL}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yg(t,e){if(t.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:_c(e)?"-0":e}}function TC(t){return{integerValue:""+t}}function t2(t,e){return PL(e)?TC(e):yg(t,e)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fh{constructor(){this._=void 0}}function n2(t,e,n){return t instanceof wc?function(i,s){const o={fields:{__type__:{stringValue:"server_timestamp"},__local_write_time__:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&dg(s)&&(s=fg(s)),s&&(o.fields.__previous_value__=s),{mapValue:o}}(n,e):t instanceof ja?SC(t,e):t instanceof Ua?CC(t,e):function(i,s){const o=IC(i,s),l=Sw(o)+Sw(i.Pe);return np(o)&&np(i.Pe)?TC(l):yg(i.serializer,l)}(t,e)}function r2(t,e,n){return t instanceof ja?SC(t,e):t instanceof Ua?CC(t,e):n}function IC(t,e){return t instanceof Ec?function(r){return np(r)||function(s){return!!s&&"doubleValue"in s}(r)}(e)?e:{integerValue:0}:null}class wc extends fh{}class ja extends fh{constructor(e){super(),this.elements=e}}function SC(t,e){const n=kC(e);for(const r of t.elements)n.some(i=>Pn(i,r))||n.push(r);return{arrayValue:{values:n}}}class Ua extends fh{constructor(e){super(),this.elements=e}}function CC(t,e){let n=kC(e);for(const r of t.elements)n=n.filter(i=>!Pn(i,r));return{arrayValue:{values:n}}}class Ec extends fh{constructor(e,n){super(),this.serializer=e,this.Pe=n}}function Sw(t){return Ve(t.integerValue||t.doubleValue)}function kC(t){return pg(t)&&t.arrayValue.values?t.arrayValue.values.slice():[]}function i2(t,e){return t.field.isEqual(e.field)&&function(r,i){return r instanceof ja&&i instanceof ja||r instanceof Ua&&i instanceof Ua?Os(r.elements,i.elements,Pn):r instanceof Ec&&i instanceof Ec?Pn(r.Pe,i.Pe):r instanceof wc&&i instanceof wc}(t.transform,e.transform)}class s2{constructor(e,n){this.version=e,this.transformResults=n}}class Xn{constructor(e,n){this.updateTime=e,this.exists=n}static none(){return new Xn}static exists(e){return new Xn(void 0,e)}static updateTime(e){return new Xn(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function Tu(t,e){return t.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(t.updateTime):t.exists===void 0||t.exists===e.isFoundDocument()}class ph{}function RC(t,e){if(!t.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return t.isNoDocument()?new NC(t.key,Xn.none()):new ul(t.key,t.data,Xn.none());{const n=t.data,r=Kt.empty();let i=new it(nt.comparator);for(let s of e.fields)if(!i.has(s)){let o=n.field(s);o===null&&s.length>1&&(s=s.popLast(),o=n.field(s)),o===null?r.delete(s):r.set(s,o),i=i.add(s)}return new Vi(t.key,r,new un(i.toArray()),Xn.none())}}function o2(t,e,n){t instanceof ul?function(i,s,o){const l=i.value.clone(),u=kw(i.fieldTransforms,s,o.transformResults);l.setAll(u),s.convertToFoundDocument(o.version,l).setHasCommittedMutations()}(t,e,n):t instanceof Vi?function(i,s,o){if(!Tu(i.precondition,s))return void s.convertToUnknownDocument(o.version);const l=kw(i.fieldTransforms,s,o.transformResults),u=s.data;u.setAll(AC(i)),u.setAll(l),s.convertToFoundDocument(o.version,u).setHasCommittedMutations()}(t,e,n):function(i,s,o){s.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,n)}function ra(t,e,n,r){return t instanceof ul?function(s,o,l,u){if(!Tu(s.precondition,o))return l;const c=s.value.clone(),d=Rw(s.fieldTransforms,u,o);return c.setAll(d),o.convertToFoundDocument(o.version,c).setHasLocalMutations(),null}(t,e,n,r):t instanceof Vi?function(s,o,l,u){if(!Tu(s.precondition,o))return l;const c=Rw(s.fieldTransforms,u,o),d=o.data;return d.setAll(AC(s)),d.setAll(c),o.convertToFoundDocument(o.version,d).setHasLocalMutations(),l===null?null:l.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map(p=>p.field))}(t,e,n,r):function(s,o,l){return Tu(s.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):l}(t,e,n)}function a2(t,e){let n=null;for(const r of t.fieldTransforms){const i=e.data.field(r.field),s=IC(r.transform,i||null);s!=null&&(n===null&&(n=Kt.empty()),n.set(r.field,s))}return n||null}function Cw(t,e){return t.type===e.type&&!!t.key.isEqual(e.key)&&!!t.precondition.isEqual(e.precondition)&&!!function(r,i){return r===void 0&&i===void 0||!(!r||!i)&&Os(r,i,(s,o)=>i2(s,o))}(t.fieldTransforms,e.fieldTransforms)&&(t.type===0?t.value.isEqual(e.value):t.type!==1||t.data.isEqual(e.data)&&t.fieldMask.isEqual(e.fieldMask))}class ul extends ph{constructor(e,n,r,i=[]){super(),this.key=e,this.value=n,this.precondition=r,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class Vi extends ph{constructor(e,n,r,i,s=[]){super(),this.key=e,this.data=n,this.fieldMask=r,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function AC(t){const e=new Map;return t.fieldMask.fields.forEach(n=>{if(!n.isEmpty()){const r=t.data.field(n);e.set(n,r)}}),e}function kw(t,e,n){const r=new Map;pe(t.length===n.length);for(let i=0;i<n.length;i++){const s=t[i],o=s.transform,l=e.data.field(s.field);r.set(s.field,r2(o,l,n[i]))}return r}function Rw(t,e,n){const r=new Map;for(const i of t){const s=i.transform,o=n.data.field(i.field);r.set(i.field,n2(s,o,e))}return r}class NC extends ph{constructor(e,n){super(),this.key=e,this.precondition=n,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class l2 extends ph{constructor(e,n){super(),this.key=e,this.precondition=n,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class u2{constructor(e,n,r,i){this.batchId=e,this.localWriteTime=n,this.baseMutations=r,this.mutations=i}applyToRemoteDocument(e,n){const r=n.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(e.key)&&o2(s,e,r[i])}}applyToLocalView(e,n){for(const r of this.baseMutations)r.key.isEqual(e.key)&&(n=ra(r,e,n,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(e.key)&&(n=ra(r,e,n,this.localWriteTime));return n}applyToLocalDocumentSet(e,n){const r=EC();return this.mutations.forEach(i=>{const s=e.get(i.key),o=s.overlayedDocument;let l=this.applyToLocalView(o,s.mutatedFields);l=n.has(i.key)?null:l;const u=RC(o,l);u!==null&&r.set(i.key,u),o.isValidDocument()||o.convertToNoDocument(J.min())}),r}keys(){return this.mutations.reduce((e,n)=>e.add(n.key),oe())}isEqual(e){return this.batchId===e.batchId&&Os(this.mutations,e.mutations,(n,r)=>Cw(n,r))&&Os(this.baseMutations,e.baseMutations,(n,r)=>Cw(n,r))}}class vg{constructor(e,n,r,i){this.batch=e,this.commitVersion=n,this.mutationResults=r,this.docVersions=i}static from(e,n,r){pe(e.mutations.length===r.length);let i=function(){return XL}();const s=e.mutations;for(let o=0;o<s.length;o++)i=i.insert(s[o].key,r[o].version);return new vg(e,n,r,i)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class c2{constructor(e,n){this.largestBatchId=e,this.mutation=n}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class h2{constructor(e,n){this.count=e,this.unchangedNames=n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var je,le;function d2(t){switch(t){default:return X();case V.CANCELLED:case V.UNKNOWN:case V.DEADLINE_EXCEEDED:case V.RESOURCE_EXHAUSTED:case V.INTERNAL:case V.UNAVAILABLE:case V.UNAUTHENTICATED:return!1;case V.INVALID_ARGUMENT:case V.NOT_FOUND:case V.ALREADY_EXISTS:case V.PERMISSION_DENIED:case V.FAILED_PRECONDITION:case V.ABORTED:case V.OUT_OF_RANGE:case V.UNIMPLEMENTED:case V.DATA_LOSS:return!0}}function PC(t){if(t===void 0)return or("GRPC error has no .code"),V.UNKNOWN;switch(t){case je.OK:return V.OK;case je.CANCELLED:return V.CANCELLED;case je.UNKNOWN:return V.UNKNOWN;case je.DEADLINE_EXCEEDED:return V.DEADLINE_EXCEEDED;case je.RESOURCE_EXHAUSTED:return V.RESOURCE_EXHAUSTED;case je.INTERNAL:return V.INTERNAL;case je.UNAVAILABLE:return V.UNAVAILABLE;case je.UNAUTHENTICATED:return V.UNAUTHENTICATED;case je.INVALID_ARGUMENT:return V.INVALID_ARGUMENT;case je.NOT_FOUND:return V.NOT_FOUND;case je.ALREADY_EXISTS:return V.ALREADY_EXISTS;case je.PERMISSION_DENIED:return V.PERMISSION_DENIED;case je.FAILED_PRECONDITION:return V.FAILED_PRECONDITION;case je.ABORTED:return V.ABORTED;case je.OUT_OF_RANGE:return V.OUT_OF_RANGE;case je.UNIMPLEMENTED:return V.UNIMPLEMENTED;case je.DATA_LOSS:return V.DATA_LOSS;default:return X()}}(le=je||(je={}))[le.OK=0]="OK",le[le.CANCELLED=1]="CANCELLED",le[le.UNKNOWN=2]="UNKNOWN",le[le.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",le[le.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",le[le.NOT_FOUND=5]="NOT_FOUND",le[le.ALREADY_EXISTS=6]="ALREADY_EXISTS",le[le.PERMISSION_DENIED=7]="PERMISSION_DENIED",le[le.UNAUTHENTICATED=16]="UNAUTHENTICATED",le[le.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",le[le.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",le[le.ABORTED=10]="ABORTED",le[le.OUT_OF_RANGE=11]="OUT_OF_RANGE",le[le.UNIMPLEMENTED=12]="UNIMPLEMENTED",le[le.INTERNAL=13]="INTERNAL",le[le.UNAVAILABLE=14]="UNAVAILABLE",le[le.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function f2(){return new TextEncoder}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const p2=new yi([4294967295,4294967295],0);function Aw(t){const e=f2().encode(t),n=new eC;return n.update(e),new Uint8Array(n.digest())}function Nw(t){const e=new DataView(t.buffer),n=e.getUint32(0,!0),r=e.getUint32(4,!0),i=e.getUint32(8,!0),s=e.getUint32(12,!0);return[new yi([n,r],0),new yi([i,s],0)]}class wg{constructor(e,n,r){if(this.bitmap=e,this.padding=n,this.hashCount=r,n<0||n>=8)throw new Lo(`Invalid padding: ${n}`);if(r<0)throw new Lo(`Invalid hash count: ${r}`);if(e.length>0&&this.hashCount===0)throw new Lo(`Invalid hash count: ${r}`);if(e.length===0&&n!==0)throw new Lo(`Invalid padding when bitmap length is 0: ${n}`);this.Ie=8*e.length-n,this.Te=yi.fromNumber(this.Ie)}Ee(e,n,r){let i=e.add(n.multiply(yi.fromNumber(r)));return i.compare(p2)===1&&(i=new yi([i.getBits(0),i.getBits(1)],0)),i.modulo(this.Te).toNumber()}de(e){return(this.bitmap[Math.floor(e/8)]&1<<e%8)!=0}mightContain(e){if(this.Ie===0)return!1;const n=Aw(e),[r,i]=Nw(n);for(let s=0;s<this.hashCount;s++){const o=this.Ee(r,i,s);if(!this.de(o))return!1}return!0}static create(e,n,r){const i=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),o=new wg(s,i,n);return r.forEach(l=>o.insert(l)),o}insert(e){if(this.Ie===0)return;const n=Aw(e),[r,i]=Nw(n);for(let s=0;s<this.hashCount;s++){const o=this.Ee(r,i,s);this.Ae(o)}}Ae(e){const n=Math.floor(e/8),r=e%8;this.bitmap[n]|=1<<r}}class Lo extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mh{constructor(e,n,r,i,s){this.snapshotVersion=e,this.targetChanges=n,this.targetMismatches=r,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,n,r){const i=new Map;return i.set(e,cl.createSynthesizedTargetChangeForCurrentChange(e,n,r)),new mh(J.min(),i,new xe(he),ar(),oe())}}class cl{constructor(e,n,r,i,s){this.resumeToken=e,this.current=n,this.addedDocuments=r,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,n,r){return new cl(r,n,oe(),oe(),oe())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Iu{constructor(e,n,r,i){this.Re=e,this.removedTargetIds=n,this.key=r,this.Ve=i}}class xC{constructor(e,n){this.targetId=e,this.me=n}}class bC{constructor(e,n,r=at.EMPTY_BYTE_STRING,i=null){this.state=e,this.targetIds=n,this.resumeToken=r,this.cause=i}}class Pw{constructor(){this.fe=0,this.ge=bw(),this.pe=at.EMPTY_BYTE_STRING,this.ye=!1,this.we=!0}get current(){return this.ye}get resumeToken(){return this.pe}get Se(){return this.fe!==0}get be(){return this.we}De(e){e.approximateByteSize()>0&&(this.we=!0,this.pe=e)}ve(){let e=oe(),n=oe(),r=oe();return this.ge.forEach((i,s)=>{switch(s){case 0:e=e.add(i);break;case 2:n=n.add(i);break;case 1:r=r.add(i);break;default:X()}}),new cl(this.pe,this.ye,e,n,r)}Ce(){this.we=!1,this.ge=bw()}Fe(e,n){this.we=!0,this.ge=this.ge.insert(e,n)}Me(e){this.we=!0,this.ge=this.ge.remove(e)}xe(){this.fe+=1}Oe(){this.fe-=1,pe(this.fe>=0)}Ne(){this.we=!0,this.ye=!0}}class m2{constructor(e){this.Le=e,this.Be=new Map,this.ke=ar(),this.qe=xw(),this.Qe=new xe(he)}Ke(e){for(const n of e.Re)e.Ve&&e.Ve.isFoundDocument()?this.$e(n,e.Ve):this.Ue(n,e.key,e.Ve);for(const n of e.removedTargetIds)this.Ue(n,e.key,e.Ve)}We(e){this.forEachTarget(e,n=>{const r=this.Ge(n);switch(e.state){case 0:this.ze(n)&&r.De(e.resumeToken);break;case 1:r.Oe(),r.Se||r.Ce(),r.De(e.resumeToken);break;case 2:r.Oe(),r.Se||this.removeTarget(n);break;case 3:this.ze(n)&&(r.Ne(),r.De(e.resumeToken));break;case 4:this.ze(n)&&(this.je(n),r.De(e.resumeToken));break;default:X()}})}forEachTarget(e,n){e.targetIds.length>0?e.targetIds.forEach(n):this.Be.forEach((r,i)=>{this.ze(i)&&n(i)})}He(e){const n=e.targetId,r=e.me.count,i=this.Je(n);if(i){const s=i.target;if(ip(s))if(r===0){const o=new G(s.path);this.Ue(n,o,_t.newNoDocument(o,J.min()))}else pe(r===1);else{const o=this.Ye(n);if(o!==r){const l=this.Ze(e),u=l?this.Xe(l,e,o):1;if(u!==0){this.je(n);const c=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Qe=this.Qe.insert(n,c)}}}}}Ze(e){const n=e.me.unchangedNames;if(!n||!n.bits)return null;const{bits:{bitmap:r="",padding:i=0},hashCount:s=0}=n;let o,l;try{o=xi(r).toUint8Array()}catch(u){if(u instanceof uC)return Ms("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{l=new wg(o,i,s)}catch(u){return Ms(u instanceof Lo?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return l.Ie===0?null:l}Xe(e,n,r){return n.me.count===r-this.nt(e,n.targetId)?0:2}nt(e,n){const r=this.Le.getRemoteKeysForTarget(n);let i=0;return r.forEach(s=>{const o=this.Le.tt(),l=`projects/${o.projectId}/databases/${o.database}/documents/${s.path.canonicalString()}`;e.mightContain(l)||(this.Ue(n,s,null),i++)}),i}rt(e){const n=new Map;this.Be.forEach((s,o)=>{const l=this.Je(o);if(l){if(s.current&&ip(l.target)){const u=new G(l.target.path);this.ke.get(u)!==null||this.it(o,u)||this.Ue(o,u,_t.newNoDocument(u,e))}s.be&&(n.set(o,s.ve()),s.Ce())}});let r=oe();this.qe.forEach((s,o)=>{let l=!0;o.forEachWhile(u=>{const c=this.Je(u);return!c||c.purpose==="TargetPurposeLimboResolution"||(l=!1,!1)}),l&&(r=r.add(s))}),this.ke.forEach((s,o)=>o.setReadTime(e));const i=new mh(e,n,this.Qe,this.ke,r);return this.ke=ar(),this.qe=xw(),this.Qe=new xe(he),i}$e(e,n){if(!this.ze(e))return;const r=this.it(e,n.key)?2:0;this.Ge(e).Fe(n.key,r),this.ke=this.ke.insert(n.key,n),this.qe=this.qe.insert(n.key,this.st(n.key).add(e))}Ue(e,n,r){if(!this.ze(e))return;const i=this.Ge(e);this.it(e,n)?i.Fe(n,1):i.Me(n),this.qe=this.qe.insert(n,this.st(n).delete(e)),r&&(this.ke=this.ke.insert(n,r))}removeTarget(e){this.Be.delete(e)}Ye(e){const n=this.Ge(e).ve();return this.Le.getRemoteKeysForTarget(e).size+n.addedDocuments.size-n.removedDocuments.size}xe(e){this.Ge(e).xe()}Ge(e){let n=this.Be.get(e);return n||(n=new Pw,this.Be.set(e,n)),n}st(e){let n=this.qe.get(e);return n||(n=new it(he),this.qe=this.qe.insert(e,n)),n}ze(e){const n=this.Je(e)!==null;return n||H("WatchChangeAggregator","Detected inactive target",e),n}Je(e){const n=this.Be.get(e);return n&&n.Se?null:this.Le.ot(e)}je(e){this.Be.set(e,new Pw),this.Le.getRemoteKeysForTarget(e).forEach(n=>{this.Ue(e,n,null)})}it(e,n){return this.Le.getRemoteKeysForTarget(e).has(n)}}function xw(){return new xe(G.comparator)}function bw(){return new xe(G.comparator)}const g2={asc:"ASCENDING",desc:"DESCENDING"},_2={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},y2={and:"AND",or:"OR"};class v2{constructor(e,n){this.databaseId=e,this.useProto3Json=n}}function op(t,e){return t.useProto3Json||uh(e)?e:{value:e}}function Tc(t,e){return t.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function DC(t,e){return t.useProto3Json?e.toBase64():e.toUint8Array()}function w2(t,e){return Tc(t,e.toTimestamp())}function Rn(t){return pe(!!t),J.fromTimestamp(function(n){const r=Kr(n);return new qe(r.seconds,r.nanos)}(t))}function Eg(t,e){return ap(t,e).canonicalString()}function ap(t,e){const n=function(i){return new Me(["projects",i.projectId,"databases",i.database])}(t).child("documents");return e===void 0?n:n.child(e)}function MC(t){const e=Me.fromString(t);return pe(jC(e)),e}function lp(t,e){return Eg(t.databaseId,e.path)}function Nd(t,e){const n=MC(e);if(n.get(1)!==t.databaseId.projectId)throw new q(V.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+n.get(1)+" vs "+t.databaseId.projectId);if(n.get(3)!==t.databaseId.database)throw new q(V.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+n.get(3)+" vs "+t.databaseId.database);return new G(LC(n))}function OC(t,e){return Eg(t.databaseId,e)}function E2(t){const e=MC(t);return e.length===4?Me.emptyPath():LC(e)}function up(t){return new Me(["projects",t.databaseId.projectId,"databases",t.databaseId.database]).canonicalString()}function LC(t){return pe(t.length>4&&t.get(4)==="documents"),t.popFirst(5)}function Dw(t,e,n){return{name:lp(t,e),fields:n.value.mapValue.fields}}function T2(t,e){let n;if("targetChange"in e){e.targetChange;const r=function(c){return c==="NO_CHANGE"?0:c==="ADD"?1:c==="REMOVE"?2:c==="CURRENT"?3:c==="RESET"?4:X()}(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],s=function(c,d){return c.useProto3Json?(pe(d===void 0||typeof d=="string"),at.fromBase64String(d||"")):(pe(d===void 0||d instanceof Buffer||d instanceof Uint8Array),at.fromUint8Array(d||new Uint8Array))}(t,e.targetChange.resumeToken),o=e.targetChange.cause,l=o&&function(c){const d=c.code===void 0?V.UNKNOWN:PC(c.code);return new q(d,c.message||"")}(o);n=new bC(r,i,s,l||null)}else if("documentChange"in e){e.documentChange;const r=e.documentChange;r.document,r.document.name,r.document.updateTime;const i=Nd(t,r.document.name),s=Rn(r.document.updateTime),o=r.document.createTime?Rn(r.document.createTime):J.min(),l=new Kt({mapValue:{fields:r.document.fields}}),u=_t.newFoundDocument(i,s,o,l),c=r.targetIds||[],d=r.removedTargetIds||[];n=new Iu(c,d,u.key,u)}else if("documentDelete"in e){e.documentDelete;const r=e.documentDelete;r.document;const i=Nd(t,r.document),s=r.readTime?Rn(r.readTime):J.min(),o=_t.newNoDocument(i,s),l=r.removedTargetIds||[];n=new Iu([],l,o.key,o)}else if("documentRemove"in e){e.documentRemove;const r=e.documentRemove;r.document;const i=Nd(t,r.document),s=r.removedTargetIds||[];n=new Iu([],s,i,null)}else{if(!("filter"in e))return X();{e.filter;const r=e.filter;r.targetId;const{count:i=0,unchangedNames:s}=r,o=new h2(i,s),l=r.targetId;n=new xC(l,o)}}return n}function I2(t,e){let n;if(e instanceof ul)n={update:Dw(t,e.key,e.value)};else if(e instanceof NC)n={delete:lp(t,e.key)};else if(e instanceof Vi)n={update:Dw(t,e.key,e.data),updateMask:b2(e.fieldMask)};else{if(!(e instanceof l2))return X();n={verify:lp(t,e.key)}}return e.fieldTransforms.length>0&&(n.updateTransforms=e.fieldTransforms.map(r=>function(s,o){const l=o.transform;if(l instanceof wc)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(l instanceof ja)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:l.elements}};if(l instanceof Ua)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:l.elements}};if(l instanceof Ec)return{fieldPath:o.field.canonicalString(),increment:l.Pe};throw X()}(0,r))),e.precondition.isNone||(n.currentDocument=function(i,s){return s.updateTime!==void 0?{updateTime:w2(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:X()}(t,e.precondition)),n}function S2(t,e){return t&&t.length>0?(pe(e!==void 0),t.map(n=>function(i,s){let o=i.updateTime?Rn(i.updateTime):Rn(s);return o.isEqual(J.min())&&(o=Rn(s)),new s2(o,i.transformResults||[])}(n,e))):[]}function C2(t,e){return{documents:[OC(t,e.path)]}}function k2(t,e){const n={structuredQuery:{}},r=e.path;let i;e.collectionGroup!==null?(i=r,n.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(i=r.popLast(),n.structuredQuery.from=[{collectionId:r.lastSegment()}]),n.parent=OC(t,i);const s=function(c){if(c.length!==0)return FC(xn.create(c,"and"))}(e.filters);s&&(n.structuredQuery.where=s);const o=function(c){if(c.length!==0)return c.map(d=>function(m){return{field:qi(m.field),direction:N2(m.dir)}}(d))}(e.orderBy);o&&(n.structuredQuery.orderBy=o);const l=op(t,e.limit);return l!==null&&(n.structuredQuery.limit=l),e.startAt&&(n.structuredQuery.startAt=function(c){return{before:c.inclusive,values:c.position}}(e.startAt)),e.endAt&&(n.structuredQuery.endAt=function(c){return{before:!c.inclusive,values:c.position}}(e.endAt)),{_t:n,parent:i}}function R2(t){let e=E2(t.parent);const n=t.structuredQuery,r=n.from?n.from.length:0;let i=null;if(r>0){pe(r===1);const d=n.from[0];d.allDescendants?i=d.collectionId:e=e.child(d.collectionId)}let s=[];n.where&&(s=function(p){const m=VC(p);return m instanceof xn&&fC(m)?m.getFilters():[m]}(n.where));let o=[];n.orderBy&&(o=function(p){return p.map(m=>function(k){return new vc(Gi(k.field),function(P){switch(P){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(k.direction))}(m))}(n.orderBy));let l=null;n.limit&&(l=function(p){let m;return m=typeof p=="object"?p.value:p,uh(m)?null:m}(n.limit));let u=null;n.startAt&&(u=function(p){const m=!!p.before,E=p.values||[];return new yc(E,m)}(n.startAt));let c=null;return n.endAt&&(c=function(p){const m=!p.before,E=p.values||[];return new yc(E,m)}(n.endAt)),HL(e,i,o,s,l,"F",u,c)}function A2(t,e){const n=function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return X()}}(e.purpose);return n==null?null:{"goog-listen-tags":n}}function VC(t){return t.unaryFilter!==void 0?function(n){switch(n.unaryFilter.op){case"IS_NAN":const r=Gi(n.unaryFilter.field);return We.create(r,"==",{doubleValue:NaN});case"IS_NULL":const i=Gi(n.unaryFilter.field);return We.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=Gi(n.unaryFilter.field);return We.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Gi(n.unaryFilter.field);return We.create(o,"!=",{nullValue:"NULL_VALUE"});default:return X()}}(t):t.fieldFilter!==void 0?function(n){return We.create(Gi(n.fieldFilter.field),function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";default:return X()}}(n.fieldFilter.op),n.fieldFilter.value)}(t):t.compositeFilter!==void 0?function(n){return xn.create(n.compositeFilter.filters.map(r=>VC(r)),function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return X()}}(n.compositeFilter.op))}(t):X()}function N2(t){return g2[t]}function P2(t){return _2[t]}function x2(t){return y2[t]}function qi(t){return{fieldPath:t.canonicalString()}}function Gi(t){return nt.fromServerFormat(t.fieldPath)}function FC(t){return t instanceof We?function(n){if(n.op==="=="){if(vw(n.value))return{unaryFilter:{field:qi(n.field),op:"IS_NAN"}};if(yw(n.value))return{unaryFilter:{field:qi(n.field),op:"IS_NULL"}}}else if(n.op==="!="){if(vw(n.value))return{unaryFilter:{field:qi(n.field),op:"IS_NOT_NAN"}};if(yw(n.value))return{unaryFilter:{field:qi(n.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:qi(n.field),op:P2(n.op),value:n.value}}}(t):t instanceof xn?function(n){const r=n.getFilters().map(i=>FC(i));return r.length===1?r[0]:{compositeFilter:{op:x2(n.op),filters:r}}}(t):X()}function b2(t){const e=[];return t.fields.forEach(n=>e.push(n.canonicalString())),{fieldPaths:e}}function jC(t){return t.length>=4&&t.get(0)==="projects"&&t.get(2)==="databases"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kr{constructor(e,n,r,i,s=J.min(),o=J.min(),l=at.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=n,this.purpose=r,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=l,this.expectedCount=u}withSequenceNumber(e){return new kr(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,n){return new kr(this.target,this.targetId,this.purpose,this.sequenceNumber,n,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new kr(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new kr(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class D2{constructor(e){this.ct=e}}function M2(t){const e=R2({parent:t.parent,structuredQuery:t.structuredQuery});return t.limitType==="LAST"?sp(e,e.limit,"L"):e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class O2{constructor(){this.un=new L2}addToCollectionParentIndex(e,n){return this.un.add(n),L.resolve()}getCollectionParents(e,n){return L.resolve(this.un.getEntries(n))}addFieldIndex(e,n){return L.resolve()}deleteFieldIndex(e,n){return L.resolve()}deleteAllFieldIndexes(e){return L.resolve()}createTargetIndexes(e,n){return L.resolve()}getDocumentsMatchingTarget(e,n){return L.resolve(null)}getIndexType(e,n){return L.resolve(0)}getFieldIndexes(e,n){return L.resolve([])}getNextCollectionGroupToUpdate(e){return L.resolve(null)}getMinOffset(e,n){return L.resolve(Gr.min())}getMinOffsetFromCollectionGroup(e,n){return L.resolve(Gr.min())}updateCollectionGroup(e,n,r){return L.resolve()}updateIndexEntries(e,n){return L.resolve()}}class L2{constructor(){this.index={}}add(e){const n=e.lastSegment(),r=e.popLast(),i=this.index[n]||new it(Me.comparator),s=!i.has(r);return this.index[n]=i.add(r),s}has(e){const n=e.lastSegment(),r=e.popLast(),i=this.index[n];return i&&i.has(r)}getEntries(e){return(this.index[e]||new it(Me.comparator)).toArray()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fs{constructor(e){this.Ln=e}next(){return this.Ln+=2,this.Ln}static Bn(){return new Fs(0)}static kn(){return new Fs(-1)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class V2{constructor(){this.changes=new eo(e=>e.toString(),(e,n)=>e.isEqual(n)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,n){this.assertNotApplied(),this.changes.set(e,_t.newInvalidDocument(e).setReadTime(n))}getEntry(e,n){this.assertNotApplied();const r=this.changes.get(n);return r!==void 0?L.resolve(r):this.getFromCache(e,n)}getEntries(e,n){return this.getAllFromCache(e,n)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class F2{constructor(e,n){this.overlayedDocument=e,this.mutatedFields=n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class j2{constructor(e,n,r,i){this.remoteDocumentCache=e,this.mutationQueue=n,this.documentOverlayCache=r,this.indexManager=i}getDocument(e,n){let r=null;return this.documentOverlayCache.getOverlay(e,n).next(i=>(r=i,this.remoteDocumentCache.getEntry(e,n))).next(i=>(r!==null&&ra(r.mutation,i,un.empty(),qe.now()),i))}getDocuments(e,n){return this.remoteDocumentCache.getEntries(e,n).next(r=>this.getLocalViewOfDocuments(e,r,oe()).next(()=>r))}getLocalViewOfDocuments(e,n,r=oe()){const i=pi();return this.populateOverlays(e,i,n).next(()=>this.computeViews(e,n,i,r).next(s=>{let o=Oo();return s.forEach((l,u)=>{o=o.insert(l,u.overlayedDocument)}),o}))}getOverlayedDocuments(e,n){const r=pi();return this.populateOverlays(e,r,n).next(()=>this.computeViews(e,n,r,oe()))}populateOverlays(e,n,r){const i=[];return r.forEach(s=>{n.has(s)||i.push(s)}),this.documentOverlayCache.getOverlays(e,i).next(s=>{s.forEach((o,l)=>{n.set(o,l)})})}computeViews(e,n,r,i){let s=ar();const o=na(),l=function(){return na()}();return n.forEach((u,c)=>{const d=r.get(c.key);i.has(c.key)&&(d===void 0||d.mutation instanceof Vi)?s=s.insert(c.key,c):d!==void 0?(o.set(c.key,d.mutation.getFieldMask()),ra(d.mutation,c,d.mutation.getFieldMask(),qe.now())):o.set(c.key,un.empty())}),this.recalculateAndSaveOverlays(e,s).next(u=>(u.forEach((c,d)=>o.set(c,d)),n.forEach((c,d)=>{var p;return l.set(c,new F2(d,(p=o.get(c))!==null&&p!==void 0?p:null))}),l))}recalculateAndSaveOverlays(e,n){const r=na();let i=new xe((o,l)=>o-l),s=oe();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,n).next(o=>{for(const l of o)l.keys().forEach(u=>{const c=n.get(u);if(c===null)return;let d=r.get(u)||un.empty();d=l.applyToLocalView(c,d),r.set(u,d);const p=(i.get(l.batchId)||oe()).add(u);i=i.insert(l.batchId,p)})}).next(()=>{const o=[],l=i.getReverseIterator();for(;l.hasNext();){const u=l.getNext(),c=u.key,d=u.value,p=EC();d.forEach(m=>{if(!s.has(m)){const E=RC(n.get(m),r.get(m));E!==null&&p.set(m,E),s=s.add(m)}}),o.push(this.documentOverlayCache.saveOverlays(e,c,p))}return L.waitFor(o)}).next(()=>r)}recalculateAndSaveOverlaysForDocumentKeys(e,n){return this.remoteDocumentCache.getEntries(e,n).next(r=>this.recalculateAndSaveOverlays(e,r))}getDocumentsMatchingQuery(e,n,r,i){return function(o){return G.isDocumentKey(o.path)&&o.collectionGroup===null&&o.filters.length===0}(n)?this.getDocumentsMatchingDocumentQuery(e,n.path):qL(n)?this.getDocumentsMatchingCollectionGroupQuery(e,n,r,i):this.getDocumentsMatchingCollectionQuery(e,n,r,i)}getNextDocuments(e,n,r,i){return this.remoteDocumentCache.getAllFromCollectionGroup(e,n,r,i).next(s=>{const o=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,n,r.largestBatchId,i-s.size):L.resolve(pi());let l=-1,u=s;return o.next(c=>L.forEach(c,(d,p)=>(l<p.largestBatchId&&(l=p.largestBatchId),s.get(d)?L.resolve():this.remoteDocumentCache.getEntry(e,d).next(m=>{u=u.insert(d,m)}))).next(()=>this.populateOverlays(e,c,s)).next(()=>this.computeViews(e,u,c,oe())).next(d=>({batchId:l,changes:wC(d)})))})}getDocumentsMatchingDocumentQuery(e,n){return this.getDocument(e,new G(n)).next(r=>{let i=Oo();return r.isFoundDocument()&&(i=i.insert(r.key,r)),i})}getDocumentsMatchingCollectionGroupQuery(e,n,r,i){const s=n.collectionGroup;let o=Oo();return this.indexManager.getCollectionParents(e,s).next(l=>L.forEach(l,u=>{const c=function(p,m){return new ch(m,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)}(n,u.child(s));return this.getDocumentsMatchingCollectionQuery(e,c,r,i).next(d=>{d.forEach((p,m)=>{o=o.insert(p,m)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,n,r,i){let s;return this.documentOverlayCache.getOverlaysForCollection(e,n.path,r.largestBatchId).next(o=>(s=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,n,r,s,i))).next(o=>{s.forEach((u,c)=>{const d=c.getKey();o.get(d)===null&&(o=o.insert(d,_t.newInvalidDocument(d)))});let l=Oo();return o.forEach((u,c)=>{const d=s.get(u);d!==void 0&&ra(d.mutation,c,un.empty(),qe.now()),dh(n,c)&&(l=l.insert(u,c))}),l})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class U2{constructor(e){this.serializer=e,this.hr=new Map,this.Pr=new Map}getBundleMetadata(e,n){return L.resolve(this.hr.get(n))}saveBundleMetadata(e,n){return this.hr.set(n.id,function(i){return{id:i.id,version:i.version,createTime:Rn(i.createTime)}}(n)),L.resolve()}getNamedQuery(e,n){return L.resolve(this.Pr.get(n))}saveNamedQuery(e,n){return this.Pr.set(n.name,function(i){return{name:i.name,query:M2(i.bundledQuery),readTime:Rn(i.readTime)}}(n)),L.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $2{constructor(){this.overlays=new xe(G.comparator),this.Ir=new Map}getOverlay(e,n){return L.resolve(this.overlays.get(n))}getOverlays(e,n){const r=pi();return L.forEach(n,i=>this.getOverlay(e,i).next(s=>{s!==null&&r.set(i,s)})).next(()=>r)}saveOverlays(e,n,r){return r.forEach((i,s)=>{this.ht(e,n,s)}),L.resolve()}removeOverlaysForBatchId(e,n,r){const i=this.Ir.get(r);return i!==void 0&&(i.forEach(s=>this.overlays=this.overlays.remove(s)),this.Ir.delete(r)),L.resolve()}getOverlaysForCollection(e,n,r){const i=pi(),s=n.length+1,o=new G(n.child("")),l=this.overlays.getIteratorFrom(o);for(;l.hasNext();){const u=l.getNext().value,c=u.getKey();if(!n.isPrefixOf(c.path))break;c.path.length===s&&u.largestBatchId>r&&i.set(u.getKey(),u)}return L.resolve(i)}getOverlaysForCollectionGroup(e,n,r,i){let s=new xe((c,d)=>c-d);const o=this.overlays.getIterator();for(;o.hasNext();){const c=o.getNext().value;if(c.getKey().getCollectionGroup()===n&&c.largestBatchId>r){let d=s.get(c.largestBatchId);d===null&&(d=pi(),s=s.insert(c.largestBatchId,d)),d.set(c.getKey(),c)}}const l=pi(),u=s.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach((c,d)=>l.set(c,d)),!(l.size()>=i)););return L.resolve(l)}ht(e,n,r){const i=this.overlays.get(r.key);if(i!==null){const o=this.Ir.get(i.largestBatchId).delete(r.key);this.Ir.set(i.largestBatchId,o)}this.overlays=this.overlays.insert(r.key,new c2(n,r));let s=this.Ir.get(n);s===void 0&&(s=oe(),this.Ir.set(n,s)),this.Ir.set(n,s.add(r.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class B2{constructor(){this.sessionToken=at.EMPTY_BYTE_STRING}getSessionToken(e){return L.resolve(this.sessionToken)}setSessionToken(e,n){return this.sessionToken=n,L.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tg{constructor(){this.Tr=new it(Ke.Er),this.dr=new it(Ke.Ar)}isEmpty(){return this.Tr.isEmpty()}addReference(e,n){const r=new Ke(e,n);this.Tr=this.Tr.add(r),this.dr=this.dr.add(r)}Rr(e,n){e.forEach(r=>this.addReference(r,n))}removeReference(e,n){this.Vr(new Ke(e,n))}mr(e,n){e.forEach(r=>this.removeReference(r,n))}gr(e){const n=new G(new Me([])),r=new Ke(n,e),i=new Ke(n,e+1),s=[];return this.dr.forEachInRange([r,i],o=>{this.Vr(o),s.push(o.key)}),s}pr(){this.Tr.forEach(e=>this.Vr(e))}Vr(e){this.Tr=this.Tr.delete(e),this.dr=this.dr.delete(e)}yr(e){const n=new G(new Me([])),r=new Ke(n,e),i=new Ke(n,e+1);let s=oe();return this.dr.forEachInRange([r,i],o=>{s=s.add(o.key)}),s}containsKey(e){const n=new Ke(e,0),r=this.Tr.firstAfterOrEqual(n);return r!==null&&e.isEqual(r.key)}}class Ke{constructor(e,n){this.key=e,this.wr=n}static Er(e,n){return G.comparator(e.key,n.key)||he(e.wr,n.wr)}static Ar(e,n){return he(e.wr,n.wr)||G.comparator(e.key,n.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class z2{constructor(e,n){this.indexManager=e,this.referenceDelegate=n,this.mutationQueue=[],this.Sr=1,this.br=new it(Ke.Er)}checkEmpty(e){return L.resolve(this.mutationQueue.length===0)}addMutationBatch(e,n,r,i){const s=this.Sr;this.Sr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new u2(s,n,r,i);this.mutationQueue.push(o);for(const l of i)this.br=this.br.add(new Ke(l.key,s)),this.indexManager.addToCollectionParentIndex(e,l.key.path.popLast());return L.resolve(o)}lookupMutationBatch(e,n){return L.resolve(this.Dr(n))}getNextMutationBatchAfterBatchId(e,n){const r=n+1,i=this.vr(r),s=i<0?0:i;return L.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return L.resolve(this.mutationQueue.length===0?-1:this.Sr-1)}getAllMutationBatches(e){return L.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,n){const r=new Ke(n,0),i=new Ke(n,Number.POSITIVE_INFINITY),s=[];return this.br.forEachInRange([r,i],o=>{const l=this.Dr(o.wr);s.push(l)}),L.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,n){let r=new it(he);return n.forEach(i=>{const s=new Ke(i,0),o=new Ke(i,Number.POSITIVE_INFINITY);this.br.forEachInRange([s,o],l=>{r=r.add(l.wr)})}),L.resolve(this.Cr(r))}getAllMutationBatchesAffectingQuery(e,n){const r=n.path,i=r.length+1;let s=r;G.isDocumentKey(s)||(s=s.child(""));const o=new Ke(new G(s),0);let l=new it(he);return this.br.forEachWhile(u=>{const c=u.key.path;return!!r.isPrefixOf(c)&&(c.length===i&&(l=l.add(u.wr)),!0)},o),L.resolve(this.Cr(l))}Cr(e){const n=[];return e.forEach(r=>{const i=this.Dr(r);i!==null&&n.push(i)}),n}removeMutationBatch(e,n){pe(this.Fr(n.batchId,"removed")===0),this.mutationQueue.shift();let r=this.br;return L.forEach(n.mutations,i=>{const s=new Ke(i.key,n.batchId);return r=r.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,i.key)}).next(()=>{this.br=r})}On(e){}containsKey(e,n){const r=new Ke(n,0),i=this.br.firstAfterOrEqual(r);return L.resolve(n.isEqual(i&&i.key))}performConsistencyCheck(e){return this.mutationQueue.length,L.resolve()}Fr(e,n){return this.vr(e)}vr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Dr(e){const n=this.vr(e);return n<0||n>=this.mutationQueue.length?null:this.mutationQueue[n]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class W2{constructor(e){this.Mr=e,this.docs=function(){return new xe(G.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,n){const r=n.key,i=this.docs.get(r),s=i?i.size:0,o=this.Mr(n);return this.docs=this.docs.insert(r,{document:n.mutableCopy(),size:o}),this.size+=o-s,this.indexManager.addToCollectionParentIndex(e,r.path.popLast())}removeEntry(e){const n=this.docs.get(e);n&&(this.docs=this.docs.remove(e),this.size-=n.size)}getEntry(e,n){const r=this.docs.get(n);return L.resolve(r?r.document.mutableCopy():_t.newInvalidDocument(n))}getEntries(e,n){let r=ar();return n.forEach(i=>{const s=this.docs.get(i);r=r.insert(i,s?s.document.mutableCopy():_t.newInvalidDocument(i))}),L.resolve(r)}getDocumentsMatchingQuery(e,n,r,i){let s=ar();const o=n.path,l=new G(o.child("")),u=this.docs.getIteratorFrom(l);for(;u.hasNext();){const{key:c,value:{document:d}}=u.getNext();if(!o.isPrefixOf(c.path))break;c.path.length>o.length+1||kL(CL(d),r)<=0||(i.has(d.key)||dh(n,d))&&(s=s.insert(d.key,d.mutableCopy()))}return L.resolve(s)}getAllFromCollectionGroup(e,n,r,i){X()}Or(e,n){return L.forEach(this.docs,r=>n(r))}newChangeBuffer(e){return new H2(this)}getSize(e){return L.resolve(this.size)}}class H2 extends V2{constructor(e){super(),this.cr=e}applyChanges(e){const n=[];return this.changes.forEach((r,i)=>{i.isValidDocument()?n.push(this.cr.addEntry(e,i)):this.cr.removeEntry(r)}),L.waitFor(n)}getFromCache(e,n){return this.cr.getEntry(e,n)}getAllFromCache(e,n){return this.cr.getEntries(e,n)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class q2{constructor(e){this.persistence=e,this.Nr=new eo(n=>mg(n),gg),this.lastRemoteSnapshotVersion=J.min(),this.highestTargetId=0,this.Lr=0,this.Br=new Tg,this.targetCount=0,this.kr=Fs.Bn()}forEachTarget(e,n){return this.Nr.forEach((r,i)=>n(i)),L.resolve()}getLastRemoteSnapshotVersion(e){return L.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return L.resolve(this.Lr)}allocateTargetId(e){return this.highestTargetId=this.kr.next(),L.resolve(this.highestTargetId)}setTargetsMetadata(e,n,r){return r&&(this.lastRemoteSnapshotVersion=r),n>this.Lr&&(this.Lr=n),L.resolve()}Kn(e){this.Nr.set(e.target,e);const n=e.targetId;n>this.highestTargetId&&(this.kr=new Fs(n),this.highestTargetId=n),e.sequenceNumber>this.Lr&&(this.Lr=e.sequenceNumber)}addTargetData(e,n){return this.Kn(n),this.targetCount+=1,L.resolve()}updateTargetData(e,n){return this.Kn(n),L.resolve()}removeTargetData(e,n){return this.Nr.delete(n.target),this.Br.gr(n.targetId),this.targetCount-=1,L.resolve()}removeTargets(e,n,r){let i=0;const s=[];return this.Nr.forEach((o,l)=>{l.sequenceNumber<=n&&r.get(l.targetId)===null&&(this.Nr.delete(o),s.push(this.removeMatchingKeysForTargetId(e,l.targetId)),i++)}),L.waitFor(s).next(()=>i)}getTargetCount(e){return L.resolve(this.targetCount)}getTargetData(e,n){const r=this.Nr.get(n)||null;return L.resolve(r)}addMatchingKeys(e,n,r){return this.Br.Rr(n,r),L.resolve()}removeMatchingKeys(e,n,r){this.Br.mr(n,r);const i=this.persistence.referenceDelegate,s=[];return i&&n.forEach(o=>{s.push(i.markPotentiallyOrphaned(e,o))}),L.waitFor(s)}removeMatchingKeysForTargetId(e,n){return this.Br.gr(n),L.resolve()}getMatchingKeysForTargetId(e,n){const r=this.Br.yr(n);return L.resolve(r)}containsKey(e,n){return L.resolve(this.Br.containsKey(n))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class G2{constructor(e,n){this.qr={},this.overlays={},this.Qr=new hg(0),this.Kr=!1,this.Kr=!0,this.$r=new B2,this.referenceDelegate=e(this),this.Ur=new q2(this),this.indexManager=new O2,this.remoteDocumentCache=function(i){return new W2(i)}(r=>this.referenceDelegate.Wr(r)),this.serializer=new D2(n),this.Gr=new U2(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.Kr=!1,Promise.resolve()}get started(){return this.Kr}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let n=this.overlays[e.toKey()];return n||(n=new $2,this.overlays[e.toKey()]=n),n}getMutationQueue(e,n){let r=this.qr[e.toKey()];return r||(r=new z2(n,this.referenceDelegate),this.qr[e.toKey()]=r),r}getGlobalsCache(){return this.$r}getTargetCache(){return this.Ur}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Gr}runTransaction(e,n,r){H("MemoryPersistence","Starting transaction:",e);const i=new K2(this.Qr.next());return this.referenceDelegate.zr(),r(i).next(s=>this.referenceDelegate.jr(i).next(()=>s)).toPromise().then(s=>(i.raiseOnCommittedEvent(),s))}Hr(e,n){return L.or(Object.values(this.qr).map(r=>()=>r.containsKey(e,n)))}}class K2 extends AL{constructor(e){super(),this.currentSequenceNumber=e}}class Ig{constructor(e){this.persistence=e,this.Jr=new Tg,this.Yr=null}static Zr(e){return new Ig(e)}get Xr(){if(this.Yr)return this.Yr;throw X()}addReference(e,n,r){return this.Jr.addReference(r,n),this.Xr.delete(r.toString()),L.resolve()}removeReference(e,n,r){return this.Jr.removeReference(r,n),this.Xr.add(r.toString()),L.resolve()}markPotentiallyOrphaned(e,n){return this.Xr.add(n.toString()),L.resolve()}removeTarget(e,n){this.Jr.gr(n.targetId).forEach(i=>this.Xr.add(i.toString()));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,n.targetId).next(i=>{i.forEach(s=>this.Xr.add(s.toString()))}).next(()=>r.removeTargetData(e,n))}zr(){this.Yr=new Set}jr(e){const n=this.persistence.getRemoteDocumentCache().newChangeBuffer();return L.forEach(this.Xr,r=>{const i=G.fromPath(r);return this.ei(e,i).next(s=>{s||n.removeEntry(i,J.min())})}).next(()=>(this.Yr=null,n.apply(e)))}updateLimboDocument(e,n){return this.ei(e,n).next(r=>{r?this.Xr.delete(n.toString()):this.Xr.add(n.toString())})}Wr(e){return 0}ei(e,n){return L.or([()=>L.resolve(this.Jr.containsKey(n)),()=>this.persistence.getTargetCache().containsKey(e,n),()=>this.persistence.Hr(e,n)])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sg{constructor(e,n,r,i){this.targetId=e,this.fromCache=n,this.$i=r,this.Ui=i}static Wi(e,n){let r=oe(),i=oe();for(const s of n.docChanges)switch(s.type){case 0:r=r.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new Sg(e,n.fromCache,r,i)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Q2{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Y2{constructor(){this.Gi=!1,this.zi=!1,this.ji=100,this.Hi=function(){return FP()?8:NL(wt())>0?6:4}()}initialize(e,n){this.Ji=e,this.indexManager=n,this.Gi=!0}getDocumentsMatchingQuery(e,n,r,i){const s={result:null};return this.Yi(e,n).next(o=>{s.result=o}).next(()=>{if(!s.result)return this.Zi(e,n,i,r).next(o=>{s.result=o})}).next(()=>{if(s.result)return;const o=new Q2;return this.Xi(e,n,o).next(l=>{if(s.result=l,this.zi)return this.es(e,n,o,l.size)})}).next(()=>s.result)}es(e,n,r,i){return r.documentReadCount<this.ji?(Ao()<=ie.DEBUG&&H("QueryEngine","SDK will not create cache indexes for query:",Hi(n),"since it only creates cache indexes for collection contains","more than or equal to",this.ji,"documents"),L.resolve()):(Ao()<=ie.DEBUG&&H("QueryEngine","Query:",Hi(n),"scans",r.documentReadCount,"local documents and returns",i,"documents as results."),r.documentReadCount>this.Hi*i?(Ao()<=ie.DEBUG&&H("QueryEngine","The SDK decides to create cache indexes for query:",Hi(n),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,kn(n))):L.resolve())}Yi(e,n){if(Iw(n))return L.resolve(null);let r=kn(n);return this.indexManager.getIndexType(e,r).next(i=>i===0?null:(n.limit!==null&&i===1&&(n=sp(n,null,"F"),r=kn(n)),this.indexManager.getDocumentsMatchingTarget(e,r).next(s=>{const o=oe(...s);return this.Ji.getDocuments(e,o).next(l=>this.indexManager.getMinOffset(e,r).next(u=>{const c=this.ts(n,l);return this.ns(n,c,o,u.readTime)?this.Yi(e,sp(n,null,"F")):this.rs(e,c,n,u)}))})))}Zi(e,n,r,i){return Iw(n)||i.isEqual(J.min())?L.resolve(null):this.Ji.getDocuments(e,r).next(s=>{const o=this.ts(n,s);return this.ns(n,o,r,i)?L.resolve(null):(Ao()<=ie.DEBUG&&H("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),Hi(n)),this.rs(e,o,n,SL(i,-1)).next(l=>l))})}ts(e,n){let r=new it(yC(e));return n.forEach((i,s)=>{dh(e,s)&&(r=r.add(s))}),r}ns(e,n,r,i){if(e.limit===null)return!1;if(r.size!==n.size)return!0;const s=e.limitType==="F"?n.last():n.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}Xi(e,n,r){return Ao()<=ie.DEBUG&&H("QueryEngine","Using full collection scan to execute query:",Hi(n)),this.Ji.getDocumentsMatchingQuery(e,n,Gr.min(),r)}rs(e,n,r,i){return this.Ji.getDocumentsMatchingQuery(e,r,i).next(s=>(n.forEach(o=>{s=s.insert(o.key,o)}),s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class X2{constructor(e,n,r,i){this.persistence=e,this.ss=n,this.serializer=i,this.os=new xe(he),this._s=new eo(s=>mg(s),gg),this.us=new Map,this.cs=e.getRemoteDocumentCache(),this.Ur=e.getTargetCache(),this.Gr=e.getBundleCache(),this.ls(r)}ls(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new j2(this.cs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.cs.setIndexManager(this.indexManager),this.ss.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",n=>e.collect(n,this.os))}}function J2(t,e,n,r){return new X2(t,e,n,r)}async function UC(t,e){const n=Z(t);return await n.persistence.runTransaction("Handle user change","readonly",r=>{let i;return n.mutationQueue.getAllMutationBatches(r).next(s=>(i=s,n.ls(e),n.mutationQueue.getAllMutationBatches(r))).next(s=>{const o=[],l=[];let u=oe();for(const c of i){o.push(c.batchId);for(const d of c.mutations)u=u.add(d.key)}for(const c of s){l.push(c.batchId);for(const d of c.mutations)u=u.add(d.key)}return n.localDocuments.getDocuments(r,u).next(c=>({hs:c,removedBatchIds:o,addedBatchIds:l}))})})}function Z2(t,e){const n=Z(t);return n.persistence.runTransaction("Acknowledge batch","readwrite-primary",r=>{const i=e.batch.keys(),s=n.cs.newChangeBuffer({trackRemovals:!0});return function(l,u,c,d){const p=c.batch,m=p.keys();let E=L.resolve();return m.forEach(k=>{E=E.next(()=>d.getEntry(u,k)).next(x=>{const P=c.docVersions.get(k);pe(P!==null),x.version.compareTo(P)<0&&(p.applyToRemoteDocument(x,c),x.isValidDocument()&&(x.setReadTime(c.commitVersion),d.addEntry(x)))})}),E.next(()=>l.mutationQueue.removeMutationBatch(u,p))}(n,r,e,s).next(()=>s.apply(r)).next(()=>n.mutationQueue.performConsistencyCheck(r)).next(()=>n.documentOverlayCache.removeOverlaysForBatchId(r,i,e.batch.batchId)).next(()=>n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,function(l){let u=oe();for(let c=0;c<l.mutationResults.length;++c)l.mutationResults[c].transformResults.length>0&&(u=u.add(l.batch.mutations[c].key));return u}(e))).next(()=>n.localDocuments.getDocuments(r,i))})}function $C(t){const e=Z(t);return e.persistence.runTransaction("Get last remote snapshot version","readonly",n=>e.Ur.getLastRemoteSnapshotVersion(n))}function eV(t,e){const n=Z(t),r=e.snapshotVersion;let i=n.os;return n.persistence.runTransaction("Apply remote event","readwrite-primary",s=>{const o=n.cs.newChangeBuffer({trackRemovals:!0});i=n.os;const l=[];e.targetChanges.forEach((d,p)=>{const m=i.get(p);if(!m)return;l.push(n.Ur.removeMatchingKeys(s,d.removedDocuments,p).next(()=>n.Ur.addMatchingKeys(s,d.addedDocuments,p)));let E=m.withSequenceNumber(s.currentSequenceNumber);e.targetMismatches.get(p)!==null?E=E.withResumeToken(at.EMPTY_BYTE_STRING,J.min()).withLastLimboFreeSnapshotVersion(J.min()):d.resumeToken.approximateByteSize()>0&&(E=E.withResumeToken(d.resumeToken,r)),i=i.insert(p,E),function(x,P,S){return x.resumeToken.approximateByteSize()===0||P.snapshotVersion.toMicroseconds()-x.snapshotVersion.toMicroseconds()>=3e8?!0:S.addedDocuments.size+S.modifiedDocuments.size+S.removedDocuments.size>0}(m,E,d)&&l.push(n.Ur.updateTargetData(s,E))});let u=ar(),c=oe();if(e.documentUpdates.forEach(d=>{e.resolvedLimboDocuments.has(d)&&l.push(n.persistence.referenceDelegate.updateLimboDocument(s,d))}),l.push(tV(s,o,e.documentUpdates).next(d=>{u=d.Ps,c=d.Is})),!r.isEqual(J.min())){const d=n.Ur.getLastRemoteSnapshotVersion(s).next(p=>n.Ur.setTargetsMetadata(s,s.currentSequenceNumber,r));l.push(d)}return L.waitFor(l).next(()=>o.apply(s)).next(()=>n.localDocuments.getLocalViewOfDocuments(s,u,c)).next(()=>u)}).then(s=>(n.os=i,s))}function tV(t,e,n){let r=oe(),i=oe();return n.forEach(s=>r=r.add(s)),e.getEntries(t,r).next(s=>{let o=ar();return n.forEach((l,u)=>{const c=s.get(l);u.isFoundDocument()!==c.isFoundDocument()&&(i=i.add(l)),u.isNoDocument()&&u.version.isEqual(J.min())?(e.removeEntry(l,u.readTime),o=o.insert(l,u)):!c.isValidDocument()||u.version.compareTo(c.version)>0||u.version.compareTo(c.version)===0&&c.hasPendingWrites?(e.addEntry(u),o=o.insert(l,u)):H("LocalStore","Ignoring outdated watch update for ",l,". Current version:",c.version," Watch version:",u.version)}),{Ps:o,Is:i}})}function nV(t,e){const n=Z(t);return n.persistence.runTransaction("Get next mutation batch","readonly",r=>(e===void 0&&(e=-1),n.mutationQueue.getNextMutationBatchAfterBatchId(r,e)))}function rV(t,e){const n=Z(t);return n.persistence.runTransaction("Allocate target","readwrite",r=>{let i;return n.Ur.getTargetData(r,e).next(s=>s?(i=s,L.resolve(i)):n.Ur.allocateTargetId(r).next(o=>(i=new kr(e,o,"TargetPurposeListen",r.currentSequenceNumber),n.Ur.addTargetData(r,i).next(()=>i))))}).then(r=>{const i=n.os.get(r.targetId);return(i===null||r.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(n.os=n.os.insert(r.targetId,r),n._s.set(e,r.targetId)),r})}async function cp(t,e,n){const r=Z(t),i=r.os.get(e),s=n?"readwrite":"readwrite-primary";try{n||await r.persistence.runTransaction("Release target",s,o=>r.persistence.referenceDelegate.removeTarget(o,i))}catch(o){if(!ll(o))throw o;H("LocalStore",`Failed to update sequence numbers for target ${e}: ${o}`)}r.os=r.os.remove(e),r._s.delete(i.target)}function Mw(t,e,n){const r=Z(t);let i=J.min(),s=oe();return r.persistence.runTransaction("Execute query","readwrite",o=>function(u,c,d){const p=Z(u),m=p._s.get(d);return m!==void 0?L.resolve(p.os.get(m)):p.Ur.getTargetData(c,d)}(r,o,kn(e)).next(l=>{if(l)return i=l.lastLimboFreeSnapshotVersion,r.Ur.getMatchingKeysForTargetId(o,l.targetId).next(u=>{s=u})}).next(()=>r.ss.getDocumentsMatchingQuery(o,e,n?i:J.min(),n?s:oe())).next(l=>(iV(r,KL(e),l),{documents:l,Ts:s})))}function iV(t,e,n){let r=t.us.get(e)||J.min();n.forEach((i,s)=>{s.readTime.compareTo(r)>0&&(r=s.readTime)}),t.us.set(e,r)}class Ow{constructor(){this.activeTargetIds=e2()}fs(e){this.activeTargetIds=this.activeTargetIds.add(e)}gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Vs(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class sV{constructor(){this.so=new Ow,this.oo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,n,r){}addLocalQueryTarget(e,n=!0){return n&&this.so.fs(e),this.oo[e]||"not-current"}updateQueryState(e,n,r){this.oo[e]=n}removeLocalQueryTarget(e){this.so.gs(e)}isLocalQueryTarget(e){return this.so.activeTargetIds.has(e)}clearQueryState(e){delete this.oo[e]}getAllActiveQueryTargets(){return this.so.activeTargetIds}isActiveQueryTarget(e){return this.so.activeTargetIds.has(e)}start(){return this.so=new Ow,Promise.resolve()}handleUserChange(e,n,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oV{_o(e){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lw{constructor(){this.ao=()=>this.uo(),this.co=()=>this.lo(),this.ho=[],this.Po()}_o(e){this.ho.push(e)}shutdown(){window.removeEventListener("online",this.ao),window.removeEventListener("offline",this.co)}Po(){window.addEventListener("online",this.ao),window.addEventListener("offline",this.co)}uo(){H("ConnectivityMonitor","Network connectivity changed: AVAILABLE");for(const e of this.ho)e(0)}lo(){H("ConnectivityMonitor","Network connectivity changed: UNAVAILABLE");for(const e of this.ho)e(1)}static D(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let eu=null;function Pd(){return eu===null?eu=function(){return 268435456+Math.round(2147483648*Math.random())}():eu++,"0x"+eu.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const aV={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lV{constructor(e){this.Io=e.Io,this.To=e.To}Eo(e){this.Ao=e}Ro(e){this.Vo=e}mo(e){this.fo=e}onMessage(e){this.po=e}close(){this.To()}send(e){this.Io(e)}yo(){this.Ao()}wo(){this.Vo()}So(e){this.fo(e)}bo(e){this.po(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ft="WebChannelConnection";class uV extends class{constructor(n){this.databaseInfo=n,this.databaseId=n.databaseId;const r=n.ssl?"https":"http",i=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.Do=r+"://"+n.host,this.vo=`projects/${i}/databases/${s}`,this.Co=this.databaseId.database==="(default)"?`project_id=${i}`:`project_id=${i}&database_id=${s}`}get Fo(){return!1}Mo(n,r,i,s,o){const l=Pd(),u=this.xo(n,r.toUriEncodedString());H("RestConnection",`Sending RPC '${n}' ${l}:`,u,i);const c={"google-cloud-resource-prefix":this.vo,"x-goog-request-params":this.Co};return this.Oo(c,s,o),this.No(n,u,c,i).then(d=>(H("RestConnection",`Received RPC '${n}' ${l}: `,d),d),d=>{throw Ms("RestConnection",`RPC '${n}' ${l} failed with error: `,d,"url: ",u,"request:",i),d})}Lo(n,r,i,s,o,l){return this.Mo(n,r,i,s,o)}Oo(n,r,i){n["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+Js}(),n["Content-Type"]="text/plain",this.databaseInfo.appId&&(n["X-Firebase-GMPID"]=this.databaseInfo.appId),r&&r.headers.forEach((s,o)=>n[o]=s),i&&i.headers.forEach((s,o)=>n[o]=s)}xo(n,r){const i=aV[n];return`${this.Do}/v1/${r}:${i}`}terminate(){}}{constructor(e){super(e),this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}No(e,n,r,i){const s=Pd();return new Promise((o,l)=>{const u=new tC;u.setWithCredentials(!0),u.listenOnce(nC.COMPLETE,()=>{try{switch(u.getLastErrorCode()){case wu.NO_ERROR:const d=u.getResponseJson();H(ft,`XHR for RPC '${e}' ${s} received:`,JSON.stringify(d)),o(d);break;case wu.TIMEOUT:H(ft,`RPC '${e}' ${s} timed out`),l(new q(V.DEADLINE_EXCEEDED,"Request time out"));break;case wu.HTTP_ERROR:const p=u.getStatus();if(H(ft,`RPC '${e}' ${s} failed with status:`,p,"response text:",u.getResponseText()),p>0){let m=u.getResponseJson();Array.isArray(m)&&(m=m[0]);const E=m==null?void 0:m.error;if(E&&E.status&&E.message){const k=function(P){const S=P.toLowerCase().replace(/_/g,"-");return Object.values(V).indexOf(S)>=0?S:V.UNKNOWN}(E.status);l(new q(k,E.message))}else l(new q(V.UNKNOWN,"Server responded with status "+u.getStatus()))}else l(new q(V.UNAVAILABLE,"Connection failed."));break;default:X()}}finally{H(ft,`RPC '${e}' ${s} completed.`)}});const c=JSON.stringify(i);H(ft,`RPC '${e}' ${s} sending request:`,i),u.send(n,"POST",c,r,15)})}Bo(e,n,r){const i=Pd(),s=[this.Do,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=sC(),l=iC(),u={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},c=this.longPollingOptions.timeoutSeconds;c!==void 0&&(u.longPollingTimeout=Math.round(1e3*c)),this.useFetchStreams&&(u.useFetchStreams=!0),this.Oo(u.initMessageHeaders,n,r),u.encodeInitMessageHeaders=!0;const d=s.join("");H(ft,`Creating RPC '${e}' stream ${i}: ${d}`,u);const p=o.createWebChannel(d,u);let m=!1,E=!1;const k=new lV({Io:P=>{E?H(ft,`Not sending because RPC '${e}' stream ${i} is closed:`,P):(m||(H(ft,`Opening RPC '${e}' stream ${i} transport.`),p.open(),m=!0),H(ft,`RPC '${e}' stream ${i} sending:`,P),p.send(P))},To:()=>p.close()}),x=(P,S,w)=>{P.listen(S,R=>{try{w(R)}catch(D){setTimeout(()=>{throw D},0)}})};return x(p,Mo.EventType.OPEN,()=>{E||(H(ft,`RPC '${e}' stream ${i} transport opened.`),k.yo())}),x(p,Mo.EventType.CLOSE,()=>{E||(E=!0,H(ft,`RPC '${e}' stream ${i} transport closed`),k.So())}),x(p,Mo.EventType.ERROR,P=>{E||(E=!0,Ms(ft,`RPC '${e}' stream ${i} transport errored:`,P),k.So(new q(V.UNAVAILABLE,"The operation could not be completed")))}),x(p,Mo.EventType.MESSAGE,P=>{var S;if(!E){const w=P.data[0];pe(!!w);const R=w,D=R.error||((S=R[0])===null||S===void 0?void 0:S.error);if(D){H(ft,`RPC '${e}' stream ${i} received error:`,D);const j=D.status;let O=function(v){const I=je[v];if(I!==void 0)return PC(I)}(j),T=D.message;O===void 0&&(O=V.INTERNAL,T="Unknown error status: "+j+" with message "+D.message),E=!0,k.So(new q(O,T)),p.close()}else H(ft,`RPC '${e}' stream ${i} received:`,w),k.bo(w)}}),x(l,rC.STAT_EVENT,P=>{P.stat===ep.PROXY?H(ft,`RPC '${e}' stream ${i} detected buffering proxy`):P.stat===ep.NOPROXY&&H(ft,`RPC '${e}' stream ${i} detected no buffering proxy`)}),setTimeout(()=>{k.wo()},0),k}}function xd(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gh(t){return new v2(t,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class BC{constructor(e,n,r=1e3,i=1.5,s=6e4){this.ui=e,this.timerId=n,this.ko=r,this.qo=i,this.Qo=s,this.Ko=0,this.$o=null,this.Uo=Date.now(),this.reset()}reset(){this.Ko=0}Wo(){this.Ko=this.Qo}Go(e){this.cancel();const n=Math.floor(this.Ko+this.zo()),r=Math.max(0,Date.now()-this.Uo),i=Math.max(0,n-r);i>0&&H("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.Ko} ms, delay with jitter: ${n} ms, last attempt: ${r} ms ago)`),this.$o=this.ui.enqueueAfterDelay(this.timerId,i,()=>(this.Uo=Date.now(),e())),this.Ko*=this.qo,this.Ko<this.ko&&(this.Ko=this.ko),this.Ko>this.Qo&&(this.Ko=this.Qo)}jo(){this.$o!==null&&(this.$o.skipDelay(),this.$o=null)}cancel(){this.$o!==null&&(this.$o.cancel(),this.$o=null)}zo(){return(Math.random()-.5)*this.Ko}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zC{constructor(e,n,r,i,s,o,l,u){this.ui=e,this.Ho=r,this.Jo=i,this.connection=s,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=l,this.listener=u,this.state=0,this.Yo=0,this.Zo=null,this.Xo=null,this.stream=null,this.e_=0,this.t_=new BC(e,n)}n_(){return this.state===1||this.state===5||this.r_()}r_(){return this.state===2||this.state===3}start(){this.e_=0,this.state!==4?this.auth():this.i_()}async stop(){this.n_()&&await this.close(0)}s_(){this.state=0,this.t_.reset()}o_(){this.r_()&&this.Zo===null&&(this.Zo=this.ui.enqueueAfterDelay(this.Ho,6e4,()=>this.__()))}a_(e){this.u_(),this.stream.send(e)}async __(){if(this.r_())return this.close(0)}u_(){this.Zo&&(this.Zo.cancel(),this.Zo=null)}c_(){this.Xo&&(this.Xo.cancel(),this.Xo=null)}async close(e,n){this.u_(),this.c_(),this.t_.cancel(),this.Yo++,e!==4?this.t_.reset():n&&n.code===V.RESOURCE_EXHAUSTED?(or(n.toString()),or("Using maximum backoff delay to prevent overloading the backend."),this.t_.Wo()):n&&n.code===V.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.l_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.mo(n)}l_(){}auth(){this.state=1;const e=this.h_(this.Yo),n=this.Yo;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([r,i])=>{this.Yo===n&&this.P_(r,i)},r=>{e(()=>{const i=new q(V.UNKNOWN,"Fetching auth token failed: "+r.message);return this.I_(i)})})}P_(e,n){const r=this.h_(this.Yo);this.stream=this.T_(e,n),this.stream.Eo(()=>{r(()=>this.listener.Eo())}),this.stream.Ro(()=>{r(()=>(this.state=2,this.Xo=this.ui.enqueueAfterDelay(this.Jo,1e4,()=>(this.r_()&&(this.state=3),Promise.resolve())),this.listener.Ro()))}),this.stream.mo(i=>{r(()=>this.I_(i))}),this.stream.onMessage(i=>{r(()=>++this.e_==1?this.E_(i):this.onNext(i))})}i_(){this.state=5,this.t_.Go(async()=>{this.state=0,this.start()})}I_(e){return H("PersistentStream",`close with error: ${e}`),this.stream=null,this.close(4,e)}h_(e){return n=>{this.ui.enqueueAndForget(()=>this.Yo===e?n():(H("PersistentStream","stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class cV extends zC{constructor(e,n,r,i,s,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",n,r,i,o),this.serializer=s}T_(e,n){return this.connection.Bo("Listen",e,n)}E_(e){return this.onNext(e)}onNext(e){this.t_.reset();const n=T2(this.serializer,e),r=function(s){if(!("targetChange"in s))return J.min();const o=s.targetChange;return o.targetIds&&o.targetIds.length?J.min():o.readTime?Rn(o.readTime):J.min()}(e);return this.listener.d_(n,r)}A_(e){const n={};n.database=up(this.serializer),n.addTarget=function(s,o){let l;const u=o.target;if(l=ip(u)?{documents:C2(s,u)}:{query:k2(s,u)._t},l.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){l.resumeToken=DC(s,o.resumeToken);const c=op(s,o.expectedCount);c!==null&&(l.expectedCount=c)}else if(o.snapshotVersion.compareTo(J.min())>0){l.readTime=Tc(s,o.snapshotVersion.toTimestamp());const c=op(s,o.expectedCount);c!==null&&(l.expectedCount=c)}return l}(this.serializer,e);const r=A2(this.serializer,e);r&&(n.labels=r),this.a_(n)}R_(e){const n={};n.database=up(this.serializer),n.removeTarget=e,this.a_(n)}}class hV extends zC{constructor(e,n,r,i,s,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",n,r,i,o),this.serializer=s}get V_(){return this.e_>0}start(){this.lastStreamToken=void 0,super.start()}l_(){this.V_&&this.m_([])}T_(e,n){return this.connection.Bo("Write",e,n)}E_(e){return pe(!!e.streamToken),this.lastStreamToken=e.streamToken,pe(!e.writeResults||e.writeResults.length===0),this.listener.f_()}onNext(e){pe(!!e.streamToken),this.lastStreamToken=e.streamToken,this.t_.reset();const n=S2(e.writeResults,e.commitTime),r=Rn(e.commitTime);return this.listener.g_(r,n)}p_(){const e={};e.database=up(this.serializer),this.a_(e)}m_(e){const n={streamToken:this.lastStreamToken,writes:e.map(r=>I2(this.serializer,r))};this.a_(n)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dV extends class{}{constructor(e,n,r,i){super(),this.authCredentials=e,this.appCheckCredentials=n,this.connection=r,this.serializer=i,this.y_=!1}w_(){if(this.y_)throw new q(V.FAILED_PRECONDITION,"The client has already been terminated.")}Mo(e,n,r,i){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,o])=>this.connection.Mo(e,ap(n,r),i,s,o)).catch(s=>{throw s.name==="FirebaseError"?(s.code===V.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new q(V.UNKNOWN,s.toString())})}Lo(e,n,r,i,s){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,l])=>this.connection.Lo(e,ap(n,r),i,o,l,s)).catch(o=>{throw o.name==="FirebaseError"?(o.code===V.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new q(V.UNKNOWN,o.toString())})}terminate(){this.y_=!0,this.connection.terminate()}}class fV{constructor(e,n){this.asyncQueue=e,this.onlineStateHandler=n,this.state="Unknown",this.S_=0,this.b_=null,this.D_=!0}v_(){this.S_===0&&(this.C_("Unknown"),this.b_=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this.b_=null,this.F_("Backend didn't respond within 10 seconds."),this.C_("Offline"),Promise.resolve())))}M_(e){this.state==="Online"?this.C_("Unknown"):(this.S_++,this.S_>=1&&(this.x_(),this.F_(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.C_("Offline")))}set(e){this.x_(),this.S_=0,e==="Online"&&(this.D_=!1),this.C_(e)}C_(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}F_(e){const n=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.D_?(or(n),this.D_=!1):H("OnlineStateTracker",n)}x_(){this.b_!==null&&(this.b_.cancel(),this.b_=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pV{constructor(e,n,r,i,s){this.localStore=e,this.datastore=n,this.asyncQueue=r,this.remoteSyncer={},this.O_=[],this.N_=new Map,this.L_=new Set,this.B_=[],this.k_=s,this.k_._o(o=>{r.enqueueAndForget(async()=>{Fi(this)&&(H("RemoteStore","Restarting streams for network reachability change."),await async function(u){const c=Z(u);c.L_.add(4),await hl(c),c.q_.set("Unknown"),c.L_.delete(4),await _h(c)}(this))})}),this.q_=new fV(r,i)}}async function _h(t){if(Fi(t))for(const e of t.B_)await e(!0)}async function hl(t){for(const e of t.B_)await e(!1)}function WC(t,e){const n=Z(t);n.N_.has(e.targetId)||(n.N_.set(e.targetId,e),Ag(n)?Rg(n):to(n).r_()&&kg(n,e))}function Cg(t,e){const n=Z(t),r=to(n);n.N_.delete(e),r.r_()&&HC(n,e),n.N_.size===0&&(r.r_()?r.o_():Fi(n)&&n.q_.set("Unknown"))}function kg(t,e){if(t.Q_.xe(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(J.min())>0){const n=t.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(n)}to(t).A_(e)}function HC(t,e){t.Q_.xe(e),to(t).R_(e)}function Rg(t){t.Q_=new m2({getRemoteKeysForTarget:e=>t.remoteSyncer.getRemoteKeysForTarget(e),ot:e=>t.N_.get(e)||null,tt:()=>t.datastore.serializer.databaseId}),to(t).start(),t.q_.v_()}function Ag(t){return Fi(t)&&!to(t).n_()&&t.N_.size>0}function Fi(t){return Z(t).L_.size===0}function qC(t){t.Q_=void 0}async function mV(t){t.q_.set("Online")}async function gV(t){t.N_.forEach((e,n)=>{kg(t,e)})}async function _V(t,e){qC(t),Ag(t)?(t.q_.M_(e),Rg(t)):t.q_.set("Unknown")}async function yV(t,e,n){if(t.q_.set("Online"),e instanceof bC&&e.state===2&&e.cause)try{await async function(i,s){const o=s.cause;for(const l of s.targetIds)i.N_.has(l)&&(await i.remoteSyncer.rejectListen(l,o),i.N_.delete(l),i.Q_.removeTarget(l))}(t,e)}catch(r){H("RemoteStore","Failed to remove targets %s: %s ",e.targetIds.join(","),r),await Ic(t,r)}else if(e instanceof Iu?t.Q_.Ke(e):e instanceof xC?t.Q_.He(e):t.Q_.We(e),!n.isEqual(J.min()))try{const r=await $C(t.localStore);n.compareTo(r)>=0&&await function(s,o){const l=s.Q_.rt(o);return l.targetChanges.forEach((u,c)=>{if(u.resumeToken.approximateByteSize()>0){const d=s.N_.get(c);d&&s.N_.set(c,d.withResumeToken(u.resumeToken,o))}}),l.targetMismatches.forEach((u,c)=>{const d=s.N_.get(u);if(!d)return;s.N_.set(u,d.withResumeToken(at.EMPTY_BYTE_STRING,d.snapshotVersion)),HC(s,u);const p=new kr(d.target,u,c,d.sequenceNumber);kg(s,p)}),s.remoteSyncer.applyRemoteEvent(l)}(t,n)}catch(r){H("RemoteStore","Failed to raise snapshot:",r),await Ic(t,r)}}async function Ic(t,e,n){if(!ll(e))throw e;t.L_.add(1),await hl(t),t.q_.set("Offline"),n||(n=()=>$C(t.localStore)),t.asyncQueue.enqueueRetryable(async()=>{H("RemoteStore","Retrying IndexedDB access"),await n(),t.L_.delete(1),await _h(t)})}function GC(t,e){return e().catch(n=>Ic(t,n,e))}async function yh(t){const e=Z(t),n=Qr(e);let r=e.O_.length>0?e.O_[e.O_.length-1].batchId:-1;for(;vV(e);)try{const i=await nV(e.localStore,r);if(i===null){e.O_.length===0&&n.o_();break}r=i.batchId,wV(e,i)}catch(i){await Ic(e,i)}KC(e)&&QC(e)}function vV(t){return Fi(t)&&t.O_.length<10}function wV(t,e){t.O_.push(e);const n=Qr(t);n.r_()&&n.V_&&n.m_(e.mutations)}function KC(t){return Fi(t)&&!Qr(t).n_()&&t.O_.length>0}function QC(t){Qr(t).start()}async function EV(t){Qr(t).p_()}async function TV(t){const e=Qr(t);for(const n of t.O_)e.m_(n.mutations)}async function IV(t,e,n){const r=t.O_.shift(),i=vg.from(r,e,n);await GC(t,()=>t.remoteSyncer.applySuccessfulWrite(i)),await yh(t)}async function SV(t,e){e&&Qr(t).V_&&await async function(r,i){if(function(o){return d2(o)&&o!==V.ABORTED}(i.code)){const s=r.O_.shift();Qr(r).s_(),await GC(r,()=>r.remoteSyncer.rejectFailedWrite(s.batchId,i)),await yh(r)}}(t,e),KC(t)&&QC(t)}async function Vw(t,e){const n=Z(t);n.asyncQueue.verifyOperationInProgress(),H("RemoteStore","RemoteStore received new credentials");const r=Fi(n);n.L_.add(3),await hl(n),r&&n.q_.set("Unknown"),await n.remoteSyncer.handleCredentialChange(e),n.L_.delete(3),await _h(n)}async function CV(t,e){const n=Z(t);e?(n.L_.delete(2),await _h(n)):e||(n.L_.add(2),await hl(n),n.q_.set("Unknown"))}function to(t){return t.K_||(t.K_=function(n,r,i){const s=Z(n);return s.w_(),new cV(r,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(t.datastore,t.asyncQueue,{Eo:mV.bind(null,t),Ro:gV.bind(null,t),mo:_V.bind(null,t),d_:yV.bind(null,t)}),t.B_.push(async e=>{e?(t.K_.s_(),Ag(t)?Rg(t):t.q_.set("Unknown")):(await t.K_.stop(),qC(t))})),t.K_}function Qr(t){return t.U_||(t.U_=function(n,r,i){const s=Z(n);return s.w_(),new hV(r,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(t.datastore,t.asyncQueue,{Eo:()=>Promise.resolve(),Ro:EV.bind(null,t),mo:SV.bind(null,t),f_:TV.bind(null,t),g_:IV.bind(null,t)}),t.B_.push(async e=>{e?(t.U_.s_(),await yh(t)):(await t.U_.stop(),t.O_.length>0&&(H("RemoteStore",`Stopping write stream with ${t.O_.length} pending writes`),t.O_=[]))})),t.U_}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ng{constructor(e,n,r,i,s){this.asyncQueue=e,this.timerId=n,this.targetTimeMs=r,this.op=i,this.removalCallback=s,this.deferred=new Ur,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,n,r,i,s){const o=Date.now()+r,l=new Ng(e,n,o,i,s);return l.start(r),l}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new q(V.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Pg(t,e){if(or("AsyncQueue",`${e}: ${t}`),ll(t))return new q(V.UNAVAILABLE,`${e}: ${t}`);throw t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vs{constructor(e){this.comparator=e?(n,r)=>e(n,r)||G.comparator(n.key,r.key):(n,r)=>G.comparator(n.key,r.key),this.keyedMap=Oo(),this.sortedSet=new xe(this.comparator)}static emptySet(e){return new vs(e.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const n=this.keyedMap.get(e);return n?this.sortedSet.indexOf(n):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((n,r)=>(e(n),!1))}add(e){const n=this.delete(e.key);return n.copy(n.keyedMap.insert(e.key,e),n.sortedSet.insert(e,null))}delete(e){const n=this.get(e);return n?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(n)):this}isEqual(e){if(!(e instanceof vs)||this.size!==e.size)return!1;const n=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;n.hasNext();){const i=n.getNext().key,s=r.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const e=[];return this.forEach(n=>{e.push(n.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,n){const r=new vs;return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=n,r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fw{constructor(){this.W_=new xe(G.comparator)}track(e){const n=e.doc.key,r=this.W_.get(n);r?e.type!==0&&r.type===3?this.W_=this.W_.insert(n,e):e.type===3&&r.type!==1?this.W_=this.W_.insert(n,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.W_=this.W_.insert(n,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.W_=this.W_.insert(n,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.W_=this.W_.remove(n):e.type===1&&r.type===2?this.W_=this.W_.insert(n,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.W_=this.W_.insert(n,{type:2,doc:e.doc}):X():this.W_=this.W_.insert(n,e)}G_(){const e=[];return this.W_.inorderTraversal((n,r)=>{e.push(r)}),e}}class js{constructor(e,n,r,i,s,o,l,u,c){this.query=e,this.docs=n,this.oldDocs=r,this.docChanges=i,this.mutatedKeys=s,this.fromCache=o,this.syncStateChanged=l,this.excludesMetadataChanges=u,this.hasCachedResults=c}static fromInitialDocuments(e,n,r,i,s){const o=[];return n.forEach(l=>{o.push({type:0,doc:l})}),new js(e,n,vs.emptySet(n),o,r,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&hh(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const n=this.docChanges,r=e.docChanges;if(n.length!==r.length)return!1;for(let i=0;i<n.length;i++)if(n[i].type!==r[i].type||!n[i].doc.isEqual(r[i].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kV{constructor(){this.z_=void 0,this.j_=[]}H_(){return this.j_.some(e=>e.J_())}}class RV{constructor(){this.queries=jw(),this.onlineState="Unknown",this.Y_=new Set}terminate(){(function(n,r){const i=Z(n),s=i.queries;i.queries=jw(),s.forEach((o,l)=>{for(const u of l.j_)u.onError(r)})})(this,new q(V.ABORTED,"Firestore shutting down"))}}function jw(){return new eo(t=>_C(t),hh)}async function AV(t,e){const n=Z(t);let r=3;const i=e.query;let s=n.queries.get(i);s?!s.H_()&&e.J_()&&(r=2):(s=new kV,r=e.J_()?0:1);try{switch(r){case 0:s.z_=await n.onListen(i,!0);break;case 1:s.z_=await n.onListen(i,!1);break;case 2:await n.onFirstRemoteStoreListen(i)}}catch(o){const l=Pg(o,`Initialization of query '${Hi(e.query)}' failed`);return void e.onError(l)}n.queries.set(i,s),s.j_.push(e),e.Z_(n.onlineState),s.z_&&e.X_(s.z_)&&xg(n)}async function NV(t,e){const n=Z(t),r=e.query;let i=3;const s=n.queries.get(r);if(s){const o=s.j_.indexOf(e);o>=0&&(s.j_.splice(o,1),s.j_.length===0?i=e.J_()?0:1:!s.H_()&&e.J_()&&(i=2))}switch(i){case 0:return n.queries.delete(r),n.onUnlisten(r,!0);case 1:return n.queries.delete(r),n.onUnlisten(r,!1);case 2:return n.onLastRemoteStoreUnlisten(r);default:return}}function PV(t,e){const n=Z(t);let r=!1;for(const i of e){const s=i.query,o=n.queries.get(s);if(o){for(const l of o.j_)l.X_(i)&&(r=!0);o.z_=i}}r&&xg(n)}function xV(t,e,n){const r=Z(t),i=r.queries.get(e);if(i)for(const s of i.j_)s.onError(n);r.queries.delete(e)}function xg(t){t.Y_.forEach(e=>{e.next()})}var hp,Uw;(Uw=hp||(hp={})).ea="default",Uw.Cache="cache";class bV{constructor(e,n,r){this.query=e,this.ta=n,this.na=!1,this.ra=null,this.onlineState="Unknown",this.options=r||{}}X_(e){if(!this.options.includeMetadataChanges){const r=[];for(const i of e.docChanges)i.type!==3&&r.push(i);e=new js(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let n=!1;return this.na?this.ia(e)&&(this.ta.next(e),n=!0):this.sa(e,this.onlineState)&&(this.oa(e),n=!0),this.ra=e,n}onError(e){this.ta.error(e)}Z_(e){this.onlineState=e;let n=!1;return this.ra&&!this.na&&this.sa(this.ra,e)&&(this.oa(this.ra),n=!0),n}sa(e,n){if(!e.fromCache||!this.J_())return!0;const r=n!=="Offline";return(!this.options._a||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||n==="Offline")}ia(e){if(e.docChanges.length>0)return!0;const n=this.ra&&this.ra.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!n)&&this.options.includeMetadataChanges===!0}oa(e){e=js.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.na=!0,this.ta.next(e)}J_(){return this.options.source!==hp.Cache}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class YC{constructor(e){this.key=e}}class XC{constructor(e){this.key=e}}class DV{constructor(e,n){this.query=e,this.Ta=n,this.Ea=null,this.hasCachedResults=!1,this.current=!1,this.da=oe(),this.mutatedKeys=oe(),this.Aa=yC(e),this.Ra=new vs(this.Aa)}get Va(){return this.Ta}ma(e,n){const r=n?n.fa:new Fw,i=n?n.Ra:this.Ra;let s=n?n.mutatedKeys:this.mutatedKeys,o=i,l=!1;const u=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,c=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(e.inorderTraversal((d,p)=>{const m=i.get(d),E=dh(this.query,p)?p:null,k=!!m&&this.mutatedKeys.has(m.key),x=!!E&&(E.hasLocalMutations||this.mutatedKeys.has(E.key)&&E.hasCommittedMutations);let P=!1;m&&E?m.data.isEqual(E.data)?k!==x&&(r.track({type:3,doc:E}),P=!0):this.ga(m,E)||(r.track({type:2,doc:E}),P=!0,(u&&this.Aa(E,u)>0||c&&this.Aa(E,c)<0)&&(l=!0)):!m&&E?(r.track({type:0,doc:E}),P=!0):m&&!E&&(r.track({type:1,doc:m}),P=!0,(u||c)&&(l=!0)),P&&(E?(o=o.add(E),s=x?s.add(d):s.delete(d)):(o=o.delete(d),s=s.delete(d)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const d=this.query.limitType==="F"?o.last():o.first();o=o.delete(d.key),s=s.delete(d.key),r.track({type:1,doc:d})}return{Ra:o,fa:r,ns:l,mutatedKeys:s}}ga(e,n){return e.hasLocalMutations&&n.hasCommittedMutations&&!n.hasLocalMutations}applyChanges(e,n,r,i){const s=this.Ra;this.Ra=e.Ra,this.mutatedKeys=e.mutatedKeys;const o=e.fa.G_();o.sort((d,p)=>function(E,k){const x=P=>{switch(P){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return X()}};return x(E)-x(k)}(d.type,p.type)||this.Aa(d.doc,p.doc)),this.pa(r),i=i!=null&&i;const l=n&&!i?this.ya():[],u=this.da.size===0&&this.current&&!i?1:0,c=u!==this.Ea;return this.Ea=u,o.length!==0||c?{snapshot:new js(this.query,e.Ra,s,o,e.mutatedKeys,u===0,c,!1,!!r&&r.resumeToken.approximateByteSize()>0),wa:l}:{wa:l}}Z_(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({Ra:this.Ra,fa:new Fw,mutatedKeys:this.mutatedKeys,ns:!1},!1)):{wa:[]}}Sa(e){return!this.Ta.has(e)&&!!this.Ra.has(e)&&!this.Ra.get(e).hasLocalMutations}pa(e){e&&(e.addedDocuments.forEach(n=>this.Ta=this.Ta.add(n)),e.modifiedDocuments.forEach(n=>{}),e.removedDocuments.forEach(n=>this.Ta=this.Ta.delete(n)),this.current=e.current)}ya(){if(!this.current)return[];const e=this.da;this.da=oe(),this.Ra.forEach(r=>{this.Sa(r.key)&&(this.da=this.da.add(r.key))});const n=[];return e.forEach(r=>{this.da.has(r)||n.push(new XC(r))}),this.da.forEach(r=>{e.has(r)||n.push(new YC(r))}),n}ba(e){this.Ta=e.Ts,this.da=oe();const n=this.ma(e.documents);return this.applyChanges(n,!0)}Da(){return js.fromInitialDocuments(this.query,this.Ra,this.mutatedKeys,this.Ea===0,this.hasCachedResults)}}class MV{constructor(e,n,r){this.query=e,this.targetId=n,this.view=r}}class OV{constructor(e){this.key=e,this.va=!1}}class LV{constructor(e,n,r,i,s,o){this.localStore=e,this.remoteStore=n,this.eventManager=r,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=o,this.Ca={},this.Fa=new eo(l=>_C(l),hh),this.Ma=new Map,this.xa=new Set,this.Oa=new xe(G.comparator),this.Na=new Map,this.La=new Tg,this.Ba={},this.ka=new Map,this.qa=Fs.kn(),this.onlineState="Unknown",this.Qa=void 0}get isPrimaryClient(){return this.Qa===!0}}async function VV(t,e,n=!0){const r=rk(t);let i;const s=r.Fa.get(e);return s?(r.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.Da()):i=await JC(r,e,n,!0),i}async function FV(t,e){const n=rk(t);await JC(n,e,!0,!1)}async function JC(t,e,n,r){const i=await rV(t.localStore,kn(e)),s=i.targetId,o=t.sharedClientState.addLocalQueryTarget(s,n);let l;return r&&(l=await jV(t,e,s,o==="current",i.resumeToken)),t.isPrimaryClient&&n&&WC(t.remoteStore,i),l}async function jV(t,e,n,r,i){t.Ka=(p,m,E)=>async function(x,P,S,w){let R=P.view.ma(S);R.ns&&(R=await Mw(x.localStore,P.query,!1).then(({documents:T})=>P.view.ma(T,R)));const D=w&&w.targetChanges.get(P.targetId),j=w&&w.targetMismatches.get(P.targetId)!=null,O=P.view.applyChanges(R,x.isPrimaryClient,D,j);return Bw(x,P.targetId,O.wa),O.snapshot}(t,p,m,E);const s=await Mw(t.localStore,e,!0),o=new DV(e,s.Ts),l=o.ma(s.documents),u=cl.createSynthesizedTargetChangeForCurrentChange(n,r&&t.onlineState!=="Offline",i),c=o.applyChanges(l,t.isPrimaryClient,u);Bw(t,n,c.wa);const d=new MV(e,n,o);return t.Fa.set(e,d),t.Ma.has(n)?t.Ma.get(n).push(e):t.Ma.set(n,[e]),c.snapshot}async function UV(t,e,n){const r=Z(t),i=r.Fa.get(e),s=r.Ma.get(i.targetId);if(s.length>1)return r.Ma.set(i.targetId,s.filter(o=>!hh(o,e))),void r.Fa.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(i.targetId),r.sharedClientState.isActiveQueryTarget(i.targetId)||await cp(r.localStore,i.targetId,!1).then(()=>{r.sharedClientState.clearQueryState(i.targetId),n&&Cg(r.remoteStore,i.targetId),dp(r,i.targetId)}).catch(al)):(dp(r,i.targetId),await cp(r.localStore,i.targetId,!0))}async function $V(t,e){const n=Z(t),r=n.Fa.get(e),i=n.Ma.get(r.targetId);n.isPrimaryClient&&i.length===1&&(n.sharedClientState.removeLocalQueryTarget(r.targetId),Cg(n.remoteStore,r.targetId))}async function BV(t,e,n){const r=QV(t);try{const i=await function(o,l){const u=Z(o),c=qe.now(),d=l.reduce((E,k)=>E.add(k.key),oe());let p,m;return u.persistence.runTransaction("Locally write mutations","readwrite",E=>{let k=ar(),x=oe();return u.cs.getEntries(E,d).next(P=>{k=P,k.forEach((S,w)=>{w.isValidDocument()||(x=x.add(S))})}).next(()=>u.localDocuments.getOverlayedDocuments(E,k)).next(P=>{p=P;const S=[];for(const w of l){const R=a2(w,p.get(w.key).overlayedDocument);R!=null&&S.push(new Vi(w.key,R,cC(R.value.mapValue),Xn.exists(!0)))}return u.mutationQueue.addMutationBatch(E,c,S,l)}).next(P=>{m=P;const S=P.applyToLocalDocumentSet(p,x);return u.documentOverlayCache.saveOverlays(E,P.batchId,S)})}).then(()=>({batchId:m.batchId,changes:wC(p)}))}(r.localStore,e);r.sharedClientState.addPendingMutation(i.batchId),function(o,l,u){let c=o.Ba[o.currentUser.toKey()];c||(c=new xe(he)),c=c.insert(l,u),o.Ba[o.currentUser.toKey()]=c}(r,i.batchId,n),await dl(r,i.changes),await yh(r.remoteStore)}catch(i){const s=Pg(i,"Failed to persist write");n.reject(s)}}async function ZC(t,e){const n=Z(t);try{const r=await eV(n.localStore,e);e.targetChanges.forEach((i,s)=>{const o=n.Na.get(s);o&&(pe(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1),i.addedDocuments.size>0?o.va=!0:i.modifiedDocuments.size>0?pe(o.va):i.removedDocuments.size>0&&(pe(o.va),o.va=!1))}),await dl(n,r,e)}catch(r){await al(r)}}function $w(t,e,n){const r=Z(t);if(r.isPrimaryClient&&n===0||!r.isPrimaryClient&&n===1){const i=[];r.Fa.forEach((s,o)=>{const l=o.view.Z_(e);l.snapshot&&i.push(l.snapshot)}),function(o,l){const u=Z(o);u.onlineState=l;let c=!1;u.queries.forEach((d,p)=>{for(const m of p.j_)m.Z_(l)&&(c=!0)}),c&&xg(u)}(r.eventManager,e),i.length&&r.Ca.d_(i),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e)}}async function zV(t,e,n){const r=Z(t);r.sharedClientState.updateQueryState(e,"rejected",n);const i=r.Na.get(e),s=i&&i.key;if(s){let o=new xe(G.comparator);o=o.insert(s,_t.newNoDocument(s,J.min()));const l=oe().add(s),u=new mh(J.min(),new Map,new xe(he),o,l);await ZC(r,u),r.Oa=r.Oa.remove(s),r.Na.delete(e),bg(r)}else await cp(r.localStore,e,!1).then(()=>dp(r,e,n)).catch(al)}async function WV(t,e){const n=Z(t),r=e.batch.batchId;try{const i=await Z2(n.localStore,e);tk(n,r,null),ek(n,r),n.sharedClientState.updateMutationState(r,"acknowledged"),await dl(n,i)}catch(i){await al(i)}}async function HV(t,e,n){const r=Z(t);try{const i=await function(o,l){const u=Z(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",c=>{let d;return u.mutationQueue.lookupMutationBatch(c,l).next(p=>(pe(p!==null),d=p.keys(),u.mutationQueue.removeMutationBatch(c,p))).next(()=>u.mutationQueue.performConsistencyCheck(c)).next(()=>u.documentOverlayCache.removeOverlaysForBatchId(c,d,l)).next(()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(c,d)).next(()=>u.localDocuments.getDocuments(c,d))})}(r.localStore,e);tk(r,e,n),ek(r,e),r.sharedClientState.updateMutationState(e,"rejected",n),await dl(r,i)}catch(i){await al(i)}}function ek(t,e){(t.ka.get(e)||[]).forEach(n=>{n.resolve()}),t.ka.delete(e)}function tk(t,e,n){const r=Z(t);let i=r.Ba[r.currentUser.toKey()];if(i){const s=i.get(e);s&&(n?s.reject(n):s.resolve(),i=i.remove(e)),r.Ba[r.currentUser.toKey()]=i}}function dp(t,e,n=null){t.sharedClientState.removeLocalQueryTarget(e);for(const r of t.Ma.get(e))t.Fa.delete(r),n&&t.Ca.$a(r,n);t.Ma.delete(e),t.isPrimaryClient&&t.La.gr(e).forEach(r=>{t.La.containsKey(r)||nk(t,r)})}function nk(t,e){t.xa.delete(e.path.canonicalString());const n=t.Oa.get(e);n!==null&&(Cg(t.remoteStore,n),t.Oa=t.Oa.remove(e),t.Na.delete(n),bg(t))}function Bw(t,e,n){for(const r of n)r instanceof YC?(t.La.addReference(r.key,e),qV(t,r)):r instanceof XC?(H("SyncEngine","Document no longer in limbo: "+r.key),t.La.removeReference(r.key,e),t.La.containsKey(r.key)||nk(t,r.key)):X()}function qV(t,e){const n=e.key,r=n.path.canonicalString();t.Oa.get(n)||t.xa.has(r)||(H("SyncEngine","New document in limbo: "+n),t.xa.add(r),bg(t))}function bg(t){for(;t.xa.size>0&&t.Oa.size<t.maxConcurrentLimboResolutions;){const e=t.xa.values().next().value;t.xa.delete(e);const n=new G(Me.fromString(e)),r=t.qa.next();t.Na.set(r,new OV(n)),t.Oa=t.Oa.insert(n,r),WC(t.remoteStore,new kr(kn(_g(n.path)),r,"TargetPurposeLimboResolution",hg.oe))}}async function dl(t,e,n){const r=Z(t),i=[],s=[],o=[];r.Fa.isEmpty()||(r.Fa.forEach((l,u)=>{o.push(r.Ka(u,e,n).then(c=>{var d;if((c||n)&&r.isPrimaryClient){const p=c?!c.fromCache:(d=n==null?void 0:n.targetChanges.get(u.targetId))===null||d===void 0?void 0:d.current;r.sharedClientState.updateQueryState(u.targetId,p?"current":"not-current")}if(c){i.push(c);const p=Sg.Wi(u.targetId,c);s.push(p)}}))}),await Promise.all(o),r.Ca.d_(i),await async function(u,c){const d=Z(u);try{await d.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>L.forEach(c,m=>L.forEach(m.$i,E=>d.persistence.referenceDelegate.addReference(p,m.targetId,E)).next(()=>L.forEach(m.Ui,E=>d.persistence.referenceDelegate.removeReference(p,m.targetId,E)))))}catch(p){if(!ll(p))throw p;H("LocalStore","Failed to update sequence numbers: "+p)}for(const p of c){const m=p.targetId;if(!p.fromCache){const E=d.os.get(m),k=E.snapshotVersion,x=E.withLastLimboFreeSnapshotVersion(k);d.os=d.os.insert(m,x)}}}(r.localStore,s))}async function GV(t,e){const n=Z(t);if(!n.currentUser.isEqual(e)){H("SyncEngine","User change. New user:",e.toKey());const r=await UC(n.localStore,e);n.currentUser=e,function(s,o){s.ka.forEach(l=>{l.forEach(u=>{u.reject(new q(V.CANCELLED,o))})}),s.ka.clear()}(n,"'waitForPendingWrites' promise is rejected due to a user change."),n.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await dl(n,r.hs)}}function KV(t,e){const n=Z(t),r=n.Na.get(e);if(r&&r.va)return oe().add(r.key);{let i=oe();const s=n.Ma.get(e);if(!s)return i;for(const o of s){const l=n.Fa.get(o);i=i.unionWith(l.view.Va)}return i}}function rk(t){const e=Z(t);return e.remoteStore.remoteSyncer.applyRemoteEvent=ZC.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=KV.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=zV.bind(null,e),e.Ca.d_=PV.bind(null,e.eventManager),e.Ca.$a=xV.bind(null,e.eventManager),e}function QV(t){const e=Z(t);return e.remoteStore.remoteSyncer.applySuccessfulWrite=WV.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=HV.bind(null,e),e}class Sc{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=gh(e.databaseInfo.databaseId),this.sharedClientState=this.Wa(e),this.persistence=this.Ga(e),await this.persistence.start(),this.localStore=this.za(e),this.gcScheduler=this.ja(e,this.localStore),this.indexBackfillerScheduler=this.Ha(e,this.localStore)}ja(e,n){return null}Ha(e,n){return null}za(e){return J2(this.persistence,new Y2,e.initialUser,this.serializer)}Ga(e){return new G2(Ig.Zr,this.serializer)}Wa(e){return new sV}async terminate(){var e,n;(e=this.gcScheduler)===null||e===void 0||e.stop(),(n=this.indexBackfillerScheduler)===null||n===void 0||n.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}Sc.provider={build:()=>new Sc};class fp{async initialize(e,n){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(n),this.remoteStore=this.createRemoteStore(n),this.eventManager=this.createEventManager(n),this.syncEngine=this.createSyncEngine(n,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>$w(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=GV.bind(null,this.syncEngine),await CV(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new RV}()}createDatastore(e){const n=gh(e.databaseInfo.databaseId),r=function(s){return new uV(s)}(e.databaseInfo);return function(s,o,l,u){return new dV(s,o,l,u)}(e.authCredentials,e.appCheckCredentials,r,n)}createRemoteStore(e){return function(r,i,s,o,l){return new pV(r,i,s,o,l)}(this.localStore,this.datastore,e.asyncQueue,n=>$w(this.syncEngine,n,0),function(){return Lw.D()?new Lw:new oV}())}createSyncEngine(e,n){return function(i,s,o,l,u,c,d){const p=new LV(i,s,o,l,u,c);return d&&(p.Qa=!0),p}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,n)}async terminate(){var e,n;await async function(i){const s=Z(i);H("RemoteStore","RemoteStore shutting down."),s.L_.add(5),await hl(s),s.k_.shutdown(),s.q_.set("Unknown")}(this.remoteStore),(e=this.datastore)===null||e===void 0||e.terminate(),(n=this.eventManager)===null||n===void 0||n.terminate()}}fp.provider={build:()=>new fp};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class YV{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ya(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ya(this.observer.error,e):or("Uncaught Error in snapshot listener:",e.toString()))}Za(){this.muted=!0}Ya(e,n){setTimeout(()=>{this.muted||e(n)},0)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XV{constructor(e,n,r,i,s){this.authCredentials=e,this.appCheckCredentials=n,this.asyncQueue=r,this.databaseInfo=i,this.user=pt.UNAUTHENTICATED,this.clientId=aC.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(r,async o=>{H("FirestoreClient","Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(r,o=>(H("FirestoreClient","Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new Ur;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(n){const r=Pg(n,"Failed to shutdown persistence");e.reject(r)}}),e.promise}}async function bd(t,e){t.asyncQueue.verifyOperationInProgress(),H("FirestoreClient","Initializing OfflineComponentProvider");const n=t.configuration;await e.initialize(n);let r=n.initialUser;t.setCredentialChangeListener(async i=>{r.isEqual(i)||(await UC(e.localStore,i),r=i)}),e.persistence.setDatabaseDeletedListener(()=>t.terminate()),t._offlineComponents=e}async function zw(t,e){t.asyncQueue.verifyOperationInProgress();const n=await JV(t);H("FirestoreClient","Initializing OnlineComponentProvider"),await e.initialize(n,t.configuration),t.setCredentialChangeListener(r=>Vw(e.remoteStore,r)),t.setAppCheckTokenChangeListener((r,i)=>Vw(e.remoteStore,i)),t._onlineComponents=e}async function JV(t){if(!t._offlineComponents)if(t._uninitializedComponentsProvider){H("FirestoreClient","Using user provided OfflineComponentProvider");try{await bd(t,t._uninitializedComponentsProvider._offline)}catch(e){const n=e;if(!function(i){return i.name==="FirebaseError"?i.code===V.FAILED_PRECONDITION||i.code===V.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11}(n))throw n;Ms("Error using user provided cache. Falling back to memory cache: "+n),await bd(t,new Sc)}}else H("FirestoreClient","Using default OfflineComponentProvider"),await bd(t,new Sc);return t._offlineComponents}async function ik(t){return t._onlineComponents||(t._uninitializedComponentsProvider?(H("FirestoreClient","Using user provided OnlineComponentProvider"),await zw(t,t._uninitializedComponentsProvider._online)):(H("FirestoreClient","Using default OnlineComponentProvider"),await zw(t,new fp))),t._onlineComponents}function ZV(t){return ik(t).then(e=>e.syncEngine)}async function eF(t){const e=await ik(t),n=e.eventManager;return n.onListen=VV.bind(null,e.syncEngine),n.onUnlisten=UV.bind(null,e.syncEngine),n.onFirstRemoteStoreListen=FV.bind(null,e.syncEngine),n.onLastRemoteStoreUnlisten=$V.bind(null,e.syncEngine),n}function tF(t,e,n={}){const r=new Ur;return t.asyncQueue.enqueueAndForget(async()=>function(s,o,l,u,c){const d=new YV({next:m=>{d.Za(),o.enqueueAndForget(()=>NV(s,p));const E=m.docs.has(l);!E&&m.fromCache?c.reject(new q(V.UNAVAILABLE,"Failed to get document because the client is offline.")):E&&m.fromCache&&u&&u.source==="server"?c.reject(new q(V.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):c.resolve(m)},error:m=>c.reject(m)}),p=new bV(_g(l.path),d,{includeMetadataChanges:!0,_a:!0});return AV(s,p)}(await eF(t),t.asyncQueue,e,n,r)),r.promise}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sk(t){const e={};return t.timeoutSeconds!==void 0&&(e.timeoutSeconds=t.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ww=new Map;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nF(t,e,n){if(!n)throw new q(V.INVALID_ARGUMENT,`Function ${t}() cannot be called with an empty ${e}.`)}function rF(t,e,n,r){if(e===!0&&r===!0)throw new q(V.INVALID_ARGUMENT,`${t} and ${n} cannot be used together.`)}function Hw(t){if(!G.isDocumentKey(t))throw new q(V.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${t} has ${t.length}.`)}function Dg(t){if(t===void 0)return"undefined";if(t===null)return"null";if(typeof t=="string")return t.length>20&&(t=`${t.substring(0,20)}...`),JSON.stringify(t);if(typeof t=="number"||typeof t=="boolean")return""+t;if(typeof t=="object"){if(t instanceof Array)return"an array";{const e=function(r){return r.constructor?r.constructor.name:null}(t);return e?`a custom ${e} object`:"an object"}}return typeof t=="function"?"a function":X()}function $a(t,e){if("_delegate"in t&&(t=t._delegate),!(t instanceof e)){if(e.name===t.constructor.name)throw new q(V.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const n=Dg(t);throw new q(V.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${n}`)}}return t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qw{constructor(e){var n,r;if(e.host===void 0){if(e.ssl!==void 0)throw new q(V.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0}else this.host=e.host,this.ssl=(n=e.ssl)===null||n===void 0||n;if(this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=41943040;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<1048576)throw new q(V.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}rF("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=sk((r=e.experimentalLongPollingOptions)!==null&&r!==void 0?r:{}),function(s){if(s.timeoutSeconds!==void 0){if(isNaN(s.timeoutSeconds))throw new q(V.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (must not be NaN)`);if(s.timeoutSeconds<5)throw new q(V.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (minimum allowed value is 5)`);if(s.timeoutSeconds>30)throw new q(V.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(r,i){return r.timeoutSeconds===i.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class Mg{constructor(e,n,r,i){this._authCredentials=e,this._appCheckCredentials=n,this._databaseId=r,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new qw({}),this._settingsFrozen=!1,this._terminateTask="notTerminated"}get app(){if(!this._app)throw new q(V.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new q(V.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new qw(e),e.credentials!==void 0&&(this._authCredentials=function(r){if(!r)return new mL;switch(r.type){case"firstParty":return new vL(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new q(V.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(n){const r=Ww.get(n);r&&(H("ComponentProvider","Removing Datastore"),Ww.delete(n),r.terminate())}(this),Promise.resolve()}}function iF(t,e,n,r={}){var i;const s=(t=$a(t,Mg))._getSettings(),o=`${e}:${n}`;if(s.host!=="firestore.googleapis.com"&&s.host!==o&&Ms("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used."),t._setSettings(Object.assign(Object.assign({},s),{host:o,ssl:!1})),r.mockUserToken){let l,u;if(typeof r.mockUserToken=="string")l=r.mockUserToken,u=pt.MOCK_USER;else{l=Y0(r.mockUserToken,(i=t._app)===null||i===void 0?void 0:i.options.projectId);const c=r.mockUserToken.sub||r.mockUserToken.user_id;if(!c)throw new q(V.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");u=new pt(c)}t._authCredentials=new gL(new oC(l,u))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Og{constructor(e,n,r){this.converter=n,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new Og(this.firestore,e,this._query)}}class Xt{constructor(e,n,r){this.converter=n,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Ba(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new Xt(this.firestore,e,this._key)}}class Ba extends Og{constructor(e,n,r){super(e,n,_g(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new Xt(this.firestore,null,new G(e))}withConverter(e){return new Ba(this.firestore,e,this._path)}}function sF(t,e,...n){if(t=Je(t),arguments.length===1&&(e=aC.newId()),nF("doc","path",e),t instanceof Mg){const r=Me.fromString(e,...n);return Hw(r),new Xt(t,null,new G(r))}{if(!(t instanceof Xt||t instanceof Ba))throw new q(V.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=t._path.child(Me.fromString(e,...n));return Hw(r),new Xt(t.firestore,t instanceof Ba?t.converter:null,new G(r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gw{constructor(e=Promise.resolve()){this.Pu=[],this.Iu=!1,this.Tu=[],this.Eu=null,this.du=!1,this.Au=!1,this.Ru=[],this.t_=new BC(this,"async_queue_retry"),this.Vu=()=>{const r=xd();r&&H("AsyncQueue","Visibility state changed to "+r.visibilityState),this.t_.jo()},this.mu=e;const n=xd();n&&typeof n.addEventListener=="function"&&n.addEventListener("visibilitychange",this.Vu)}get isShuttingDown(){return this.Iu}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.fu(),this.gu(e)}enterRestrictedMode(e){if(!this.Iu){this.Iu=!0,this.Au=e||!1;const n=xd();n&&typeof n.removeEventListener=="function"&&n.removeEventListener("visibilitychange",this.Vu)}}enqueue(e){if(this.fu(),this.Iu)return new Promise(()=>{});const n=new Ur;return this.gu(()=>this.Iu&&this.Au?Promise.resolve():(e().then(n.resolve,n.reject),n.promise)).then(()=>n.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Pu.push(e),this.pu()))}async pu(){if(this.Pu.length!==0){try{await this.Pu[0](),this.Pu.shift(),this.t_.reset()}catch(e){if(!ll(e))throw e;H("AsyncQueue","Operation failed with retryable error: "+e)}this.Pu.length>0&&this.t_.Go(()=>this.pu())}}gu(e){const n=this.mu.then(()=>(this.du=!0,e().catch(r=>{this.Eu=r,this.du=!1;const i=function(o){let l=o.message||"";return o.stack&&(l=o.stack.includes(o.message)?o.stack:o.message+`
`+o.stack),l}(r);throw or("INTERNAL UNHANDLED ERROR: ",i),r}).then(r=>(this.du=!1,r))));return this.mu=n,n}enqueueAfterDelay(e,n,r){this.fu(),this.Ru.indexOf(e)>-1&&(n=0);const i=Ng.createAndSchedule(this,e,n,r,s=>this.yu(s));return this.Tu.push(i),i}fu(){this.Eu&&X()}verifyOperationInProgress(){}async wu(){let e;do e=this.mu,await e;while(e!==this.mu)}Su(e){for(const n of this.Tu)if(n.timerId===e)return!0;return!1}bu(e){return this.wu().then(()=>{this.Tu.sort((n,r)=>n.targetTimeMs-r.targetTimeMs);for(const n of this.Tu)if(n.skipDelay(),e!=="all"&&n.timerId===e)break;return this.wu()})}Du(e){this.Ru.push(e)}yu(e){const n=this.Tu.indexOf(e);this.Tu.splice(n,1)}}class Lg extends Mg{constructor(e,n,r,i){super(e,n,r,i),this.type="firestore",this._queue=new Gw,this._persistenceKey=(i==null?void 0:i.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new Gw(e),this._firestoreClient=void 0,await e}}}function oF(t,e){const n=typeof t=="object"?t:Im(),r=typeof t=="string"?t:"(default)",i=Yc(n,"firestore").getImmediate({identifier:r});if(!i._initialized){const s=G0("firestore");s&&iF(i,...s)}return i}function ok(t){if(t._terminated)throw new q(V.FAILED_PRECONDITION,"The client has already been terminated.");return t._firestoreClient||aF(t),t._firestoreClient}function aF(t){var e,n,r;const i=t._freezeSettings(),s=function(l,u,c,d){return new bL(l,u,c,d.host,d.ssl,d.experimentalForceLongPolling,d.experimentalAutoDetectLongPolling,sk(d.experimentalLongPollingOptions),d.useFetchStreams)}(t._databaseId,((e=t._app)===null||e===void 0?void 0:e.options.appId)||"",t._persistenceKey,i);t._componentsProvider||!((n=i.localCache)===null||n===void 0)&&n._offlineComponentProvider&&(!((r=i.localCache)===null||r===void 0)&&r._onlineComponentProvider)&&(t._componentsProvider={_offline:i.localCache._offlineComponentProvider,_online:i.localCache._onlineComponentProvider}),t._firestoreClient=new XV(t._authCredentials,t._appCheckCredentials,t._queue,s,t._componentsProvider&&function(l){const u=l==null?void 0:l._online.build();return{_offline:l==null?void 0:l._offline.build(u),_online:u}}(t._componentsProvider))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Us{constructor(e){this._byteString=e}static fromBase64String(e){try{return new Us(at.fromBase64String(e))}catch(n){throw new q(V.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+n)}}static fromUint8Array(e){return new Us(at.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vg{constructor(...e){for(let n=0;n<e.length;++n)if(e[n].length===0)throw new q(V.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new nt(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ak{constructor(e){this._methodName=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fg{constructor(e,n){if(!isFinite(e)||e<-90||e>90)throw new q(V.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(n)||n<-180||n>180)throw new q(V.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+n);this._lat=e,this._long=n}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}toJSON(){return{latitude:this._lat,longitude:this._long}}_compareTo(e){return he(this._lat,e._lat)||he(this._long,e._long)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jg{constructor(e){this._values=(e||[]).map(n=>n)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(r,i){if(r.length!==i.length)return!1;for(let s=0;s<r.length;++s)if(r[s]!==i[s])return!1;return!0}(this._values,e._values)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lF=/^__.*__$/;class uF{constructor(e,n,r){this.data=e,this.fieldMask=n,this.fieldTransforms=r}toMutation(e,n){return this.fieldMask!==null?new Vi(e,this.data,this.fieldMask,n,this.fieldTransforms):new ul(e,this.data,n,this.fieldTransforms)}}function lk(t){switch(t){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw X()}}class Ug{constructor(e,n,r,i,s,o){this.settings=e,this.databaseId=n,this.serializer=r,this.ignoreUndefinedProperties=i,s===void 0&&this.vu(),this.fieldTransforms=s||[],this.fieldMask=o||[]}get path(){return this.settings.path}get Cu(){return this.settings.Cu}Fu(e){return new Ug(Object.assign(Object.assign({},this.settings),e),this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}Mu(e){var n;const r=(n=this.path)===null||n===void 0?void 0:n.child(e),i=this.Fu({path:r,xu:!1});return i.Ou(e),i}Nu(e){var n;const r=(n=this.path)===null||n===void 0?void 0:n.child(e),i=this.Fu({path:r,xu:!1});return i.vu(),i}Lu(e){return this.Fu({path:void 0,xu:!0})}Bu(e){return Cc(e,this.settings.methodName,this.settings.ku||!1,this.path,this.settings.qu)}contains(e){return this.fieldMask.find(n=>e.isPrefixOf(n))!==void 0||this.fieldTransforms.find(n=>e.isPrefixOf(n.field))!==void 0}vu(){if(this.path)for(let e=0;e<this.path.length;e++)this.Ou(this.path.get(e))}Ou(e){if(e.length===0)throw this.Bu("Document fields must not be empty");if(lk(this.Cu)&&lF.test(e))throw this.Bu('Document fields cannot begin and end with "__"')}}class cF{constructor(e,n,r){this.databaseId=e,this.ignoreUndefinedProperties=n,this.serializer=r||gh(e)}Qu(e,n,r,i=!1){return new Ug({Cu:e,methodName:n,qu:r,path:nt.emptyPath(),xu:!1,ku:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function hF(t){const e=t._freezeSettings(),n=gh(t._databaseId);return new cF(t._databaseId,!!e.ignoreUndefinedProperties,n)}function dF(t,e,n,r,i,s={}){const o=t.Qu(s.merge||s.mergeFields?2:0,e,n,i);dk("Data must be an object, but it was:",o,r);const l=ck(r,o);let u,c;if(s.merge)u=new un(o.fieldMask),c=o.fieldTransforms;else if(s.mergeFields){const d=[];for(const p of s.mergeFields){const m=fF(e,p,n);if(!o.contains(m))throw new q(V.INVALID_ARGUMENT,`Field '${m}' is specified in your field mask but missing from your input data.`);mF(d,m)||d.push(m)}u=new un(d),c=o.fieldTransforms.filter(p=>u.covers(p.field))}else u=null,c=o.fieldTransforms;return new uF(new Kt(l),u,c)}function uk(t,e){if(hk(t=Je(t)))return dk("Unsupported field value:",e,t),ck(t,e);if(t instanceof ak)return function(r,i){if(!lk(i.Cu))throw i.Bu(`${r._methodName}() can only be used with update() and set()`);if(!i.path)throw i.Bu(`${r._methodName}() is not currently supported inside arrays`);const s=r._toFieldTransform(i);s&&i.fieldTransforms.push(s)}(t,e),null;if(t===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),t instanceof Array){if(e.settings.xu&&e.Cu!==4)throw e.Bu("Nested arrays are not supported");return function(r,i){const s=[];let o=0;for(const l of r){let u=uk(l,i.Lu(o));u==null&&(u={nullValue:"NULL_VALUE"}),s.push(u),o++}return{arrayValue:{values:s}}}(t,e)}return function(r,i){if((r=Je(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return t2(i.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const s=qe.fromDate(r);return{timestampValue:Tc(i.serializer,s)}}if(r instanceof qe){const s=new qe(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:Tc(i.serializer,s)}}if(r instanceof Fg)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof Us)return{bytesValue:DC(i.serializer,r._byteString)};if(r instanceof Xt){const s=i.databaseId,o=r.firestore._databaseId;if(!o.isEqual(s))throw i.Bu(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:Eg(r.firestore._databaseId||i.databaseId,r._key.path)}}if(r instanceof jg)return function(o,l){return{mapValue:{fields:{__type__:{stringValue:"__vector__"},value:{arrayValue:{values:o.toArray().map(u=>{if(typeof u!="number")throw l.Bu("VectorValues must only contain numeric values.");return yg(l.serializer,u)})}}}}}}(r,i);throw i.Bu(`Unsupported field value: ${Dg(r)}`)}(t,e)}function ck(t,e){const n={};return lC(t)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Zs(t,(r,i)=>{const s=uk(i,e.Mu(r));s!=null&&(n[r]=s)}),{mapValue:{fields:n}}}function hk(t){return!(typeof t!="object"||t===null||t instanceof Array||t instanceof Date||t instanceof qe||t instanceof Fg||t instanceof Us||t instanceof Xt||t instanceof ak||t instanceof jg)}function dk(t,e,n){if(!hk(n)||!function(i){return typeof i=="object"&&i!==null&&(Object.getPrototypeOf(i)===Object.prototype||Object.getPrototypeOf(i)===null)}(n)){const r=Dg(n);throw r==="an object"?e.Bu(t+" a custom object"):e.Bu(t+" "+r)}}function fF(t,e,n){if((e=Je(e))instanceof Vg)return e._internalPath;if(typeof e=="string")return fk(t,e);throw Cc("Field path arguments must be of type string or ",t,!1,void 0,n)}const pF=new RegExp("[~\\*/\\[\\]]");function fk(t,e,n){if(e.search(pF)>=0)throw Cc(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,t,!1,void 0,n);try{return new Vg(...e.split("."))._internalPath}catch{throw Cc(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,t,!1,void 0,n)}}function Cc(t,e,n,r,i){const s=r&&!r.isEmpty(),o=i!==void 0;let l=`Function ${e}() called with invalid data`;n&&(l+=" (via `toFirestore()`)"),l+=". ";let u="";return(s||o)&&(u+=" (found",s&&(u+=` in field ${r}`),o&&(u+=` in document ${i}`),u+=")"),new q(V.INVALID_ARGUMENT,l+t+u)}function mF(t,e){return t.some(n=>n.isEqual(e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pk{constructor(e,n,r,i,s){this._firestore=e,this._userDataWriter=n,this._key=r,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new Xt(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new gF(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const n=this._document.data.field(mk("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n)}}}class gF extends pk{data(){return super.data()}}function mk(t,e){return typeof e=="string"?fk(t,e):e instanceof Vg?e._internalPath:e._delegate._internalPath}class _F{convertValue(e,n="none"){switch(bi(e)){case 0:return null;case 1:return e.booleanValue;case 2:return Ve(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,n);case 5:return e.stringValue;case 6:return this.convertBytes(xi(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,n);case 11:return this.convertObject(e.mapValue,n);case 10:return this.convertVectorValue(e.mapValue);default:throw X()}}convertObject(e,n){return this.convertObjectMap(e.fields,n)}convertObjectMap(e,n="none"){const r={};return Zs(e,(i,s)=>{r[i]=this.convertValue(s,n)}),r}convertVectorValue(e){var n,r,i;const s=(i=(r=(n=e.fields)===null||n===void 0?void 0:n.value.arrayValue)===null||r===void 0?void 0:r.values)===null||i===void 0?void 0:i.map(o=>Ve(o.doubleValue));return new jg(s)}convertGeoPoint(e){return new Fg(Ve(e.latitude),Ve(e.longitude))}convertArray(e,n){return(e.values||[]).map(r=>this.convertValue(r,n))}convertServerTimestamp(e,n){switch(n){case"previous":const r=fg(e);return r==null?null:this.convertValue(r,n);case"estimate":return this.convertTimestamp(La(e));default:return null}}convertTimestamp(e){const n=Kr(e);return new qe(n.seconds,n.nanos)}convertDocumentKey(e,n){const r=Me.fromString(e);pe(jC(r));const i=new Va(r.get(1),r.get(3)),s=new G(r.popFirst(5));return i.isEqual(n)||or(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${n.projectId}/${n.database}) instead.`),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yF(t,e,n){let r;return r=t?n&&(n.merge||n.mergeFields)?t.toFirestore(e,n):t.toFirestore(e):e,r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vF{constructor(e,n){this.hasPendingWrites=e,this.fromCache=n}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class gk extends pk{constructor(e,n,r,i,s,o){super(e,n,r,i,o),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const n=new wF(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(n,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,n={}){if(this._document){const r=this._document.data.field(mk("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,n.serverTimestamps)}}}class wF extends gk{data(e={}){return super.data(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function EF(t){t=$a(t,Xt);const e=$a(t.firestore,Lg);return tF(ok(e),t._key).then(n=>CF(e,t,n))}class TF extends _F{constructor(e){super(),this.firestore=e}convertBytes(e){return new Us(e)}convertReference(e){const n=this.convertDocumentKey(e,this.firestore._databaseId);return new Xt(this.firestore,null,n)}}function IF(t,e,n){t=$a(t,Xt);const r=$a(t.firestore,Lg),i=yF(t.converter,e,n);return SF(r,[dF(hF(r),"setDoc",t._key,i,t.converter!==null,n).toMutation(t._key,Xn.none())])}function SF(t,e){return function(r,i){const s=new Ur;return r.asyncQueue.enqueueAndForget(async()=>BV(await ZV(r),i,s)),s.promise}(ok(t),e)}function CF(t,e,n){const r=n.docs.get(e._key),i=new TF(t);return new gk(t,i,e._key,r,new vF(n.hasPendingWrites,n.fromCache),e.converter)}(function(e,n=!0){(function(i){Js=i})(Oi),Ci(new zr("firestore",(r,{instanceIdentifier:i,options:s})=>{const o=r.getProvider("app").getImmediate(),l=new Lg(new _L(r.getProvider("auth-internal")),new EL(r.getProvider("app-check-internal")),function(c,d){if(!Object.prototype.hasOwnProperty.apply(c.options,["projectId"]))throw new q(V.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Va(c.options.projectId,d)}(o,i),o);return s=Object.assign({useFetchStreams:n},s),l._setSettings(s),l},"PUBLIC").setMultipleInstances(!0)),Sn(fw,"4.7.3",e),Sn(fw,"4.7.3","esm2017")})();const $g=tI({apiKey:"AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc",authDomain:"entertainment-71888.firebaseapp.com",databaseURL:"https://entertainment-71888-default-rtdb.firebaseio.com",projectId:"entertainment-71888",storageBucket:"entertainment-71888.firebasestorage.app",messagingSenderId:"660524340277",appId:"1:660524340277:web:ef8f4ed04fa985a4f88d7c"}),kc=iD($g),ia=dL($g),kF=oF($g),RF="ironhold",AF=3e4,_k=(()=>{try{let t=localStorage.getItem("ironhold.device");return t||(t=Math.random().toString(36).slice(2,10),localStorage.setItem("ironhold.device",t)),t}catch{return"nodevice"}})(),yk=t=>String(t).toLowerCase().replace(/@/g,"_at_").replace(/\./g,"_"),Kw="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";function NF(){let t="";for(let e=0;e<8;e++)t+=Kw.charAt(Math.floor(Math.random()*Kw.length));return t}async function PF(t){const e=yk(t.email??""),n=Zo(ia,`users/${e}/friend_code`),r=(await gc(n)).val();if(r)return String(r).toUpperCase();for(let i=0;i<6;i++){const s=NF();if(!(await gc(Zo(ia,`accounts/friend_codes/${s}`))).exists())return await hw(Zo(ia,`accounts/friend_codes/${s}`),e),await hw(n,s),s}throw new Error("Could not create a friend code")}const vk=t=>sF(kF,"user",t.toUpperCase(),"platform","mobile","game",RF);async function wk(){const t=new Bn;try{await db(kc,t)}catch(e){const n=e.code;if(n==="auth/popup-blocked"||n==="auth/operation-not-supported-in-this-environment"){await yb(kc,t);return}if(n==="auth/popup-closed-by-user"||n==="auth/cancelled-popup-request")return;throw n==="auth/unauthorized-domain"?new Error(`Sign-in isn't switched on for ${location.hostname} yet (Firebase > Authentication > Settings > Authorized domains).`):e}}const xF=()=>qx(kc);function bF(t){return Hx(kc,async e=>{if(!e||!e.email)return t(null);let n="";try{n=await PF(e)}catch(s){console.warn("friend code",s)}let r=e.displayName??"",i=e.photoURL??"";try{const s=yk(e.email),o=(await gc(Zo(ia,`users/${s}/username`))).val(),l=(await gc(Zo(ia,`users/${s}/avatar_url`))).val();typeof o=="string"&&o.trim()&&(r=o.trim().slice(0,20)),typeof l=="string"&&l&&(i=l.replace(/^http:\/\//,"https://"))}catch{}t({name:r,email:e.email,photo:i,code:n})})}async function Qw(t){const e=await EF(vk(t));if(!e.exists())return null;const n=e.data();if(!n.save)return null;try{const r=JSON.parse(n.save);return!r||r.version!==lm||!Array.isArray(r.buildings)||!r.stats?null:{state:r,saveAt:n.saveAt??r.updatedAt??0,device:n.device??""}}catch{return null}}async function DF(t,e){const n=e.updatedAt||Date.now();return await IF(vk(t),{save:JSON.stringify(e),saveAt:n,device:_k,game:"Ironhold",name:e.name},{merge:!0}),n}const MF=(t,e)=>t.createdAt===e.createdAt&&t.seed===e.seed;function OF(t,e,n){const[r,i]=ae.useState(null),[s,o]=ae.useState(""),[l,u]=ae.useState(null),c=ae.useRef(null),d=D=>{c.current=D,u(D)},p=ae.useRef(!1),m=ae.useRef(0),E=ae.useRef(0),k=ae.useRef(!0),x=ae.useRef(null),P=D=>{bf(D.state),n(D.state),m.current=D.saveAt},S=async(D=!1)=>{const j=x.current,O=t.current;if(!(!j||!j.code||!O||!p.current)&&!(!D&&(document.hidden||Date.now()-E.current<AF))&&!(O.updatedAt<=m.current)){E.current=Date.now();try{m.current=await DF(j.code,O),o("Saved to your account")}catch(T){console.warn("cloud save failed (kept on this device)",T),o("Offline: saving on this device, will sync later")}}},w=async(D,j)=>{if(!D)return o("");if(!D.code)return o("Could not load your friend code; saving on this device only.");o("Syncing…");let O=null;try{O=await Qw(D.code)}catch(v){return console.warn("cloud load failed",v),o("Offline: playing from this device, will sync when back online.")}const T=t.current,y=T?j?e:T.updatedAt:0;if(!O&&!T)return p.current=!0,o("Signed in. Your game will save to your account.");if(O&&!T)return P(O),p.current=!0,o("Loaded your saved game.");if(!O&&T){p.current=!0,await S(!0);return}if(O&&T&&MF(O.state,T)){O.saveAt>y?(P(O),o("Loaded your newer save from another device.")):(m.current=0,p.current=!0,await S(!0)),p.current=!0;return}O&&d({code:D.code,cloud:O}),o("")};return ae.useEffect(()=>bF(D=>{const j=k.current;k.current=!1,x.current=D,i(D),p.current=!1,d(null),w(D,j)}),[]),ae.useEffect(()=>{const D=window.setInterval(()=>void S(),5e3),j=async()=>{const y=x.current;if(document.hidden)return void S(!0);if(!(!y||!y.code)){if(!p.current)return void(c.current?void 0:w(y,!0));try{const v=await Qw(y.code);v&&v.device!==_k&&v.saveAt>m.current&&(P(v),o("Loaded your newer save from another device."))}catch{}}},O=()=>void S(!0),T=()=>{const y=x.current;y&&y.code&&!p.current&&!c.current?w(y,!0):S(!0)};return document.addEventListener("visibilitychange",j),window.addEventListener("pagehide",O),window.addEventListener("online",T),()=>{window.clearInterval(D),document.removeEventListener("visibilitychange",j),window.removeEventListener("pagehide",O),window.removeEventListener("online",T)}},[]),{user:r,status:s,clash:l,resolve:async D=>{l&&(D==="cloud"?P(l.cloud):m.current=0,p.current=!0,d(null),D==="device"?await S(!0):o("Loaded your saved game."))}}}function Yw(t){return`${t.name||"Commander"} · ${t.alliance.name} · CC Lv ${mn(t)} · ${t.wavesCleared} waves · ${_e(t.stats.merges)} merges`}function LF({clash:t,local:e,onPick:n}){return!t||!e?null:g.jsx("div",{className:"cloud-modal",children:g.jsxs("div",{className:"card cloud-card",children:[g.jsx("h2",{children:"Which game do you want to keep?"}),g.jsx("p",{className:"muted",children:"Your account already has a different Ironhold game than the one on this device."}),g.jsxs("button",{className:"btn primary big",onClick:()=>n("cloud"),children:["Load my account's game",g.jsx("small",{children:Yw(t.cloud.state)}),g.jsxs("small",{children:["last played ",new Date(t.cloud.saveAt).toLocaleString()]})]}),g.jsxs("button",{className:"btn big",onClick:()=>n("device"),children:["Keep this device's game",g.jsx("small",{children:Yw(e)}),g.jsx("small",{className:"warn",children:"replaces the game saved on your account"})]})]})})}function VF({user:t,status:e}){const[n,r]=ae.useState("");return t?g.jsxs("span",{className:"account",children:[t.photo?g.jsx("img",{className:"avatar",src:t.photo,alt:"",referrerPolicy:"no-referrer"}):null,g.jsxs("span",{className:"who",children:[g.jsx("b",{children:t.name||t.email}),t.code&&g.jsxs("span",{className:"muted",children:["Friend code ",t.code]}),e&&g.jsx("span",{className:"cloud-status",children:e})]}),g.jsx("button",{className:"btn small",onClick:()=>void xF(),title:"Sign out (your game stays on this device too)",children:"Sign out"})]}):g.jsxs("span",{className:"account",children:[g.jsx("button",{className:"btn small",onClick:()=>wk().catch(i=>r(String(i.message||i))),title:"Sign in to keep your game on every device",children:"Sign in to save"}),n&&g.jsx("span",{className:"cloud-status warn",children:n})]})}function FF({user:t,status:e}){const[n,r]=ae.useState("");return t?g.jsx("p",{className:"okline",children:e||`Signed in as ${t.name||t.email}.`}):g.jsxs("div",{className:"start-signin",children:[g.jsx("button",{className:"btn big",type:"button",onClick:()=>wk().catch(i=>r(String(i.message||i))),children:"Sign in with Google to load your saved game"}),g.jsx("p",{className:"muted",children:"Signed in, your progress is kept on your account, so you can switch devices any time."}),n&&g.jsx("p",{className:"warn",children:n})]})}const Xw=[{key:"research",label:"Research",short:"Tech",icon:"🔬"},{key:"troops",label:"Troops",short:"Troops",icon:"🛡"},{key:"heroes",label:"Heroes",short:"Heroes",icon:"★"},{key:"world",label:"Frontier",short:"Map",icon:"🗺"},{key:"banner",label:"Banner",short:"Banner",icon:"⚑"}];function jF({onStart:t,signin:e}){const[n,r]=ae.useState(""),i=Df()!==null;return g.jsx("div",{className:"start",children:g.jsxs("div",{className:"start-card",children:[g.jsx("div",{className:"brand-mark big",children:"❖"}),g.jsx("h1",{children:"Ironhold"}),g.jsx("p",{className:"sub",children:"Frontier Command · merge, grind, conquer"}),g.jsx("p",{className:"hint",children:"Everything is earned. No VIP tiers, no packages, no boosters, no shop of any kind — time on the island and the skill of your merge decisions are the only things that make you strong."}),g.jsxs("ul",{className:"feature-list",children:[g.jsx("li",{children:"Raise structures, then merge two identical ones into the next level. Mismatched levels never combine."}),g.jsx("li",{children:"Three research ceilings gate everything: Structure Level, Merge Level, and Unit Force Combination."}),g.jsx("li",{children:"Train and combine troops, hunt monsters, and break waves to open more island plots."}),g.jsx("li",{children:"Heroes grow from the time you gather and the fights you take. Gear only drops from ground you explore."})]}),e,i&&g.jsx("p",{className:"okline",children:"You were invited to a banner — you will join it on start."}),g.jsxs("form",{onSubmit:s=>{s.preventDefault(),t(n)},children:[g.jsx("input",{className:"name-input",placeholder:"Commander name",maxLength:20,value:n,onChange:s=>r(s.target.value)}),g.jsx("button",{className:"btn primary big",type:"submit",children:"Found your banner"})]})]})})}function UF(){const[t,e]=ae.useState(()=>mP()),[n,r]=ae.useState("research"),[i,s]=ae.useState(0),[o,l]=ae.useState(null),u=ae.useRef(null);u.current=t;const c=ae.useRef(-1);c.current<0&&(c.current=(t==null?void 0:t.updatedAt)??0);const d=OF(u,c.current,P=>{u.current=P,e(P)}),p=P=>{e(S=>{if(!S)return S;const w=structuredClone(S);return P(w),w.updatedAt=Date.now(),w})};ae.useEffect(()=>{const P=window.setInterval(()=>{e(S=>{if(!S)return S;const w=structuredClone(S);return YN(w),w})},1e3);return()=>window.clearInterval(P)},[]),ae.useEffect(()=>{const P=window.setInterval(()=>{u.current&&bf(u.current)},4e3),S=()=>{u.current&&bf(u.current)};return window.addEventListener("beforeunload",S),document.addEventListener("visibilitychange",S),()=>{window.clearInterval(P),window.removeEventListener("beforeunload",S),document.removeEventListener("visibilitychange",S)}},[]);const m=ae.useRef(!1);if(ae.useEffect(()=>{if(m.current)return;m.current=!0;const P=Df();!P||!t||(p(S=>{gm(S,P)}),_P())},[t]),!t)return g.jsx(jF,{onStart:P=>e(QN(P,Df()??void 0)),signin:g.jsx(FF,{user:d.user,status:d.status})});const E=t,k=pm(E),x=()=>{var P;(P=document.getElementById("sections"))==null||P.scrollIntoView({behavior:"smooth",block:"start"})};return g.jsxs("div",{className:"app",children:[g.jsxs("header",{className:"topbar",children:[g.jsxs("div",{className:"brand",children:[g.jsx("div",{className:"brand-mark",children:"❖"}),g.jsxs("div",{children:[g.jsx("h1",{children:"Ironhold"}),g.jsx("span",{className:"sub",children:E.alliance.name})]})]}),g.jsx("div",{className:"res-row",children:Mt.map(P=>g.jsxs("div",{className:"res-chip",title:`${vn[P].name}: +${_e(k[P]*3600)} per hour`,children:[g.jsx("span",{className:"ico",children:vn[P].icon}),g.jsx("span",{className:"val",children:_e(E.resources[P])}),g.jsxs("span",{className:"rate",children:["+",_e(k[P]*3600),"/h"]})]},P))}),g.jsxs("div",{className:"topmeta",children:[g.jsxs("span",{className:"stat-pill",children:[g.jsx("span",{className:"muted",children:"Power"})," ",g.jsx("b",{children:_e(nr(E))})]}),g.jsxs("span",{className:"stat-pill",children:[g.jsx("span",{className:"muted",children:"CC"})," ",g.jsxs("b",{children:["Lv ",mn(E)]})]}),g.jsxs("span",{className:"stat-pill",children:[g.jsx("span",{className:"muted",children:"Waves"})," ",g.jsx("b",{children:E.wavesCleared})]}),g.jsx(VF,{user:d.user,status:d.status})]})]}),g.jsx(LF,{clash:d.clash,local:E,onPick:P=>void d.resolve(P)}),g.jsx("div",{className:"jobs-strip",children:E.jobs.length===0?g.jsx("span",{className:"muted",children:"No jobs running — build, research, train or send a gathering party."}):E.jobs.map(P=>g.jsxs("div",{className:"strip-job",children:[g.jsx("span",{children:P.label}),g.jsx("b",{children:ot(Math.max(0,(P.endsAt-Date.now())/1e3))})]},P.id))}),g.jsxs("main",{className:"layout",children:[g.jsx(yP,{s:E,act:p,island:i,setIsland:s,selectedUid:o,setSelectedUid:l,setTab:r}),g.jsxs("aside",{className:"col-side",id:"sections",children:[g.jsx("div",{className:"tabs",children:Xw.map(P=>g.jsx("button",{className:`tab ${n===P.key?"active":""}`,onClick:()=>r(P.key),children:P.label},P.key))}),n==="research"&&g.jsx(vP,{s:E,act:p}),n==="troops"&&g.jsx(wP,{s:E,act:p}),n==="heroes"&&g.jsx(TP,{s:E,act:p}),n==="world"&&g.jsx(IP,{s:E,act:p}),n==="banner"&&g.jsx(SP,{s:E,act:p}),g.jsxs("div",{className:"card log-card",children:[g.jsxs("div",{className:"card-head",children:[g.jsx("h2",{children:"Field Log"}),g.jsx("span",{className:"pill",children:E.log.length})]}),g.jsxs("div",{className:"log-list",children:[E.log.length===0&&g.jsx("p",{className:"muted",children:"Nothing yet."}),E.log.slice(0,24).map(P=>g.jsxs("div",{className:`log-line ${P.tone}`,children:[g.jsx("span",{className:"time",children:new Date(P.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}),P.text]},P.id))]})]})]})]}),g.jsxs("footer",{className:"foot",children:["Ironhold · no shop, no VIP, no packages · ",d.user?"saved to your account and this browser":"saved in this browser (sign in to keep it on every device)"]}),g.jsxs("nav",{className:"mobile-nav",children:[g.jsxs("button",{className:"mnav-btn",onClick:()=>window.scrollTo({top:0,behavior:"smooth"}),children:[g.jsx("span",{className:"ico",children:"🏝"}),"Base"]}),Xw.map(P=>g.jsxs("button",{className:`mnav-btn ${n===P.key?"active":""}`,onClick:()=>{r(P.key),x()},children:[g.jsx("span",{className:"ico",children:P.icon}),P.short]},P.key))]})]})}const Jw=document.getElementById("root");Jw&&h0(Jw).render(g.jsx(UF,{}));
