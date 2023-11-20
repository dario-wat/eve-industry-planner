import axios from 'axios';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

axios.defaults.baseURL = 'https://qmm534tebb.us-west-2.awsapprunner.com';
// axios.defaults.baseURL = 'https://localhost:8080';
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;    // needed for cookies

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
);
