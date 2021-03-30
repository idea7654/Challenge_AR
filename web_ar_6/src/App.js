import React, { useState } from "react";
import { selectedObject, xrSession } from "../public/index";

const App = () => {
    const checkSelected = setInterval(check, 1000);
    const [staticVar, setStaticVar] = useState(null);
    function check() {
        if (!xrSession && selectedObject) {
            clearInterval(checkSelected);
            setStaticVar(selectedObject);
        }
    }
    return (
        <div>
            {staticVar ? <div>선택하신 건물은 {staticVar}입니다!!</div> : ""}
        </div>
    );
};

export default App;
