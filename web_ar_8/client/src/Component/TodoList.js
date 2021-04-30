import React from "react";

const TodoList = ({ id, text, onFinish, onRemove, ChangeState }) => {
  //console.log(id);
  return (
    <div>
      <div className="flex mb-4 items-center">
        {onFinish ? (
          <p className="w-full line-through text-grey-darkest">{text}</p>
        ) : (
          <p className="w-full text-grey-darkest">{text}</p>
        )}
        {onFinish ? (
          <div>
            <button
              className="flex-no-shrink p-2 ml-4 mr-2 border-gray-100 border rounded hover:text-white text-green hover:bg-green"
              onClick={() => ChangeState(id)}
            >
              Not Done
            </button>
          </div>
        ) : (
          <div>
            <button
              className="flex-no-shrink p-2 ml-4 mr-2 border-gray-100 border rounded hover:text-white text-green hover:bg-green"
              onClick={() => ChangeState(id)}
            >
              Done
            </button>
          </div>
        )}

        <button
          className="flex-no-shrink p-2 ml-2 border rounded text-red border-red hover:text-white hover:bg-red"
          onClick={() => onRemove(id)}
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default TodoList;
