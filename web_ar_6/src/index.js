import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "@babel/polyfill";
import { BrowsesrRouter } from "react-router-dom";
ReactDOM.render(
    <BrowsesrRouter>
        <App />
    </BrowsesrRouter>,
    document.getElementById("root")
);
