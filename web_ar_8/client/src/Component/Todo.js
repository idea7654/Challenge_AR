import React, { useState, useEffect } from "react";
import TodoList from "./TodoList";
import socketIO from "socket.io-client";
const Todo = () => {
  const [Input, setInput] = useState("");
  const [List, setList] = useState([]);
  const [Id, setId] = useState(0);
  const [SocketID, setSocketID] = useState(null);
  const socket = socketIO.connect("http://localhost:5000");
  function onAdd(e) {
    e.preventDefault();
    setList(List.concat({ id: Id, text: Input, onFinish: false }));
    setId(Id + 1);
    setInput("");
  }

  function onRemove(id) {
    setList(List.filter((i) => i.id != id));
  }

  function ChangeState(id) {
    const updated = List.map((i) => {
      if (i.id == id) {
        const updateItem = { ...i, onFinish: !i.onFinish };
        if (updateItem.onFinish) {
          socket.emit("GetItem", SocketID);
        } else {
          socket.emit("RemoveItem", SocketID);
        }
        return updateItem;
      }
      return i;
    });
    setList(updated);
  }

  useEffect(() => {
    socket.emit("firstConnect");

    socket.on("firstConnect", (data) => {
      setSocketID(data);
    });
  }, []);
  return (
    <div>
      <div className="h-100 w-full flex items-center justify-center bg-teal-lightest font-sans">
        <div className="bg-white rounded shadow p-6 m-4 w-full lg:w-3/4 lg:max-w-lg">
          <div className="mb-4">
            <h1 className="text-grey-darkest">Todo List</h1>
            <div className="flex mt-4">
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 mr-4 text-grey-darker"
                placeholder="Add Todo"
                value={Input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                className="flex-no-shrink p-2 border rounded text-teal border-teal hover:text-white hover:bg-teal"
                onClick={onAdd}
              >
                Add
              </button>
            </div>
          </div>
          <div>
            {List.length == 0
              ? ""
              : List.map((i) => {
                  return (
                    <TodoList
                      key={i.id}
                      id={i.id}
                      text={i.text}
                      onFinish={i.onFinish}
                      onRemove={onRemove}
                      ChangeState={ChangeState}
                    />
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Todo;
