import React, { useState } from "react";
import { selectedObject, xrSession } from "../public/index";
import Okkyun from "./Page/Okkyun";
import Landing from "./Page/Landing";
const App = ({ history }) => {
    const checkSelected = setInterval(check, 1000);
    const [staticVar, setStaticVar] = useState(null);
    const [selectedPage, setSeletedPage] = useState(null);
    function check() {
        if (!xrSession && selectedObject) {
            clearInterval(checkSelected);
            setStaticVar(selectedObject);
            setSelectedPage(redirectPage(obj));
        }
    }

    function redirectPage(obj) {
        switch (obj) {
            case "배재대 김옥균관":
                return <Okkyun />;
                break;
            default:
                return;
        }
    }
    return (
        <div>
            {staticVar ? <div>선택하신 건물은 {staticVar}입니다!!</div> : ""}
            {selectedPage ? selectedPage : ""}
        </div>
    );
};

export default App;
