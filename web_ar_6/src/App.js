import React, { useState } from "react";
import { selectedObject, xrSession } from "../public/index";
import { Route, withRouter } from "react-router-dom";
import Okkyun from "./Page/Okkyun";
import Landing from "./Page/Landing";
const App = ({ history }) => {
    const checkSelected = setInterval(check, 1000);
    const [staticVar, setStaticVar] = useState(null);
    function check() {
        if (!xrSession && selectedObject) {
            clearInterval(checkSelected);
            setStaticVar(selectedObject);
            redirectPage(obj);
        }
    }

    function redirectPage(obj) {
        switch (obj) {
            case "배재대 김옥균관":
                history.push("/okkyun");
                break;
            default:
                return;
        }
    }
    return (
        <div>
            {staticVar ? <div>선택하신 건물은 {staticVar}입니다!!</div> : ""}
            <Route path="/" render={() => <Landing />} exact />
            <Route path="/okkyun" render={() => <Okkyun />} />
        </div>
    );
};

export default withRouter(App);
