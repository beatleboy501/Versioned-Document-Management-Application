import React from "react";
import cognitoConfig from "../cognito-config.json";
import Auth from "./Auth";
import Main from './Main';
import "../styles/App.css";

function App() {
  return (
    <Auth config={cognitoConfig}>
      <Main />
    </Auth>
  );
}

export default App;
