(this.webpackJsonpresume=this.webpackJsonpresume||[]).push([[3],{101:function(e,n,t){"use strict";t.r(n);var a=t(0),r=t(9),o=t.n(r),i=(t(91),t(57)),s=t(108),c=t(41),u=t(44),d=t(26),l=t(4),j=function(e){var n=Object(a.useState)("Dashboard"),t=Object(i.a)(n,2),r=t[0],o=t[1];return Object(l.jsxs)(s.a,{theme:d.darkTheme,children:[Object(l.jsx)(u.default,{clickFunction:function(e){return o(e)}}),Object(l.jsx)(c.default,{component:r})]})},f=Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));function h(e){navigator.serviceWorker.register(e).then((function(e){e.onupdatefound=function(){var n=e.installing;n.onstatechange=function(){"installed"===n.state&&(navigator.serviceWorker.controller?console.log("New content is available; please refresh."):console.log("Content is cached for offline use."))}}})).catch((function(e){console.error("Error during service worker registration:",e)}))}o.a.render(Object(l.jsx)(j,{}),document.getElementById("root")),function(){if("serviceWorker"in navigator){if(new URL("",window.location).origin!==window.location.origin)return;window.addEventListener("load",(function(){var e="".concat("","/service-worker.js");f?(!function(e){fetch(e).then((function(n){404===n.status||-1===n.headers.get("content-type").indexOf("javascript")?navigator.serviceWorker.ready.then((function(e){e.unregister().then((function(){window.location.reload()}))})):h(e)})).catch((function(){console.log("No internet connection found. App is running in offline mode.")}))}(e),navigator.serviceWorker.ready.then((function(){console.log("This web app is being served cache-first by a service worker. To learn more, visit https://goo.gl/SC7cgQ")}))):h(e)}))}}()},26:function(e,n,t){"use strict";t.r(n),t.d(n,"darkTheme",(function(){return r}));var a=t(63),r=Object(a.a)({palette:{type:"dark"}})},41:function(e,n,t){"use strict";t.r(n);t(0);var a=t(108),r=t(42),o=t(43),i=t(26),s=t(4);n.default=function(e){return Object(s.jsx)(a.a,{theme:i.darkTheme,children:Object(s.jsx)("main",{style:{marginLeft:"180px"},children:(n=e.component,console.log("./MdFiles/".concat(n,".md")),"Dashboard"==n?Object(s.jsx)(o.default,{}):Object(s.jsx)(r.default,{link:"./MdFiles/".concat(n,".md")}))})});var n}},42:function(e,n,t){"use strict";t.r(n);var a=t(57),r=t(0),o=t(65),i=t(4);n.default=function(e){var n=Object(r.useState)(""),s=Object(a.a)(n,2),c=s[0],u=s[1];return Object(r.useEffect)((function(){t(93)("".concat(e.link)).then((function(e){return fetch(e.default).then((function(e){return e.text()})).then((function(e){return u(e)}))}))})),Object(i.jsx)(o.a,{children:c})}},43:function(e,n,t){"use strict";t.r(n);t(0);var a=t(102),r=t(104),o=t(106),i=t(107),s=t(35),c=t(62),u=t(4);n.default=function(){return Object(u.jsx)(a.a,{children:Object(u.jsxs)(r.a,{children:[Object(u.jsx)(o.a,{children:Object(u.jsx)("img",{src:c.default,width:"100%",height:"90%"})}),Object(u.jsx)(i.a,{children:Object(u.jsx)(s.a,{children:"\"When the body gets tired, mind says 'This is where winners are made.' When mind gets tired, my heart says 'This is where Champions are made.'\" - Baylor Barbee"})})]})})}},44:function(e,n,t){"use strict";t.r(n);t(0);var a=t(113),r=t(77),o=t(109),i=t(115),s=t(112),c=t(116),u=t(78),d=t(110),l=t(114),j=t(111),f=t(71),h=t.n(f),m=t(70),g=t.n(m),p=t(73),b=t.n(p),v=t(72),O=t.n(v),x=t(60),w=t(61),k=t(4),I=["Dashboard","Education","Experience","Projects"],y=[Object(k.jsx)(g.a,{}),Object(k.jsx)(h.a,{}),Object(k.jsx)(O.a,{}),Object(k.jsx)(b.a,{})];n.default=function(e){return Object(k.jsxs)(a.a,{variant:"permanent",children:[Object(k.jsx)(r.a,{}),Object(k.jsxs)(o.a,{children:[Object(k.jsx)(i.a,{title:"Resume",children:Object(k.jsx)(r.a,{variant:"dense",children:Object(k.jsx)(s.a,{mx:"auto",children:Object(k.jsx)("a",{href:w.default,children:Object(k.jsx)(c.a,{src:x.default})})})})}),Object(k.jsx)(u.a,{primary:"Kaushal Kanakamedala"}),Object(k.jsx)(d.a,{}),I.map((function(n,t){return Object(k.jsxs)(l.a,{button:!0,onClick:function(){return e.clickFunction(n)},children:[Object(k.jsx)(j.a,{children:y[t]}),Object(k.jsx)(u.a,{primary:n})]},n)}))]})]})}},60:function(e,n,t){"use strict";t.r(n),n.default=t.p+"static/media/logo.99f21c53.jpg"},61:function(e,n,t){"use strict";t.r(n),n.default=t.p+"static/media/Kaushal-Latest.30245711.pdf"},62:function(e,n,t){"use strict";t.r(n),n.default=t.p+"static/media/main.fd9bac96.jpg"},91:function(e,n,t){},93:function(e,n,t){var a={"./DashboardComponent":[43],"./DashboardComponent.js":[43],"./DisplayController":[41],"./DisplayController.js":[41],"./HeaderComponent":[82,0],"./HeaderComponent.js":[82,0],"./Images/IBM.png":[117,10],"./Images/JavaImages/AccessModifiers.png":[118,11],"./Images/JavaImages/Collection-Framework-hierarchy.png":[119,12],"./Images/JavaImages/ExceptionHierarchy.jpg":[120,13],"./Images/JavaImages/Initialization.png":[121,14],"./Images/JavaImages/InterfaceVsAbstractClassJava8.png":[122,15],"./Images/JavaImages/StaticMemoryExecution.png":[123,16],"./Images/JavaImages/SuperAndThis.png":[124,17],"./Images/SRMUniversity.jpg":[125,18],"./Images/logo.jpg":[60],"./Images/main.jpg":[62],"./Images/uncc.jpg":[126,19],"./Kaushal-Latest.pdf":[61],"./MarkdownComponent":[42],"./MarkdownComponent.js":[42],"./MarkdownTester":[80,1],"./MarkdownTester.js":[80,1],"./MdFiles/Education.md":[127,6],"./MdFiles/Experience.md":[128,7],"./MdFiles/Markdown.md":[129,8],"./MdFiles/Projects.md":[130,9],"./MenuComponent":[44],"./MenuComponent.js":[44],"./Themes":[26],"./Themes.js":[26],"./Work":[81,2],"./Work.js":[81,2]};function r(e){if(!t.o(a,e))return Promise.resolve().then((function(){var n=new Error("Cannot find module '"+e+"'");throw n.code="MODULE_NOT_FOUND",n}));var n=a[e],r=n[0];return Promise.all(n.slice(1).map(t.e)).then((function(){return t(r)}))}r.keys=function(){return Object.keys(a)},r.id=93,e.exports=r}},[[101,4,5]]]);
//# sourceMappingURL=main.4b13df42.chunk.js.map