'use client';

import React, { useEffect } from 'react';

const BoardToken = '78f88446-1ef1-e58f-8dce-3f80949154e2';

declare global {
  interface Window {
    Canny: any;
    attachEvent: any;
  }
}

const FeedbackWidget = () => {
  useEffect(() => {
    (function(w,d,i,s){function l(){if(!d.getElementById(i)){var f=d.getElementsByTagName(s)[0],e=d.createElement(s);e.type="text/javascript",e.async=!0,e.src="https://canny.io/sdk.js",f.parentNode.insertBefore(e,f)}}if("function"!=typeof w.Canny){var c=function(){c.q.push(arguments)};c.q=[],w.Canny=c,"complete"===d.readyState?l():w.attachEvent?w.attachEvent("onload",l):w.addEventListener("load",l,!1)}})(window,document,"canny-jssdk","script");

    window.Canny('render', {
      boardToken: BoardToken,
      basePath: '/app/feedback', // Updated based on the page location
      ssoToken: null, // SSO is not configured yet
      theme: 'auto', // Changed to auto to match user preference
    });
  }, []);

  return (
    <div data-canny />
  );
}

export default FeedbackWidget;

