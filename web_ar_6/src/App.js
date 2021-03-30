import React from "react";
import { buildInfo } from "../public/index";
import { selectedObject } from "../public/index";

setInterval(check, 1000);

function check() {
    console.log(selectedObject);
}

const App = () => {
    return <div>안녕하세요!!!</div>;
};

export default App;
