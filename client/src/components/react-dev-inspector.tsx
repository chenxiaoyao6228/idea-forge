import React from "react";
import { Inspector } from "react-dev-inspector";

const InspectorWrapper =
  import.meta.env.MODE === "development" ? Inspector : React.Fragment;

const baseUrl = "http://localhost:5173"; // 保证请求能够到达webpack-dev-server

function generateSearchParams(params: Object = {}) {
  const searchParams = new URLSearchParams();

  for (let key in params) {
    // @ts-ignore
    searchParams.append(key, params[key]);
  }

  return searchParams.toString();
}

function get(url: string, callback?: Function) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var response = xhr.responseText;
      callback && callback(null, response);
    } else if (xhr.readyState === 4) {
      callback && callback(new Error("Error: " + xhr.status));
    }
  };
  xhr.send();
}

const AppWithInspector: React.FC<any> = ({ children }) => {
  return (
    <InspectorWrapper
      keys={["shift", "z", "x"]}
      onClickElement={(ele: any) => {
        if (!ele || !ele.codeInfo) return;

        const {
          codeInfo: { lineNumber, columnNumber, relativePath },
        } = ele;
        const launchPath = `${baseUrl}/__open-stack-frame-in-editor/relative?${generateSearchParams(
          {
            fileName: relativePath,
            lineNumber: lineNumber,
            columnNumber: columnNumber,
          }
        )}`;
        get(launchPath);
      }}>
      {children}
    </InspectorWrapper>
  );
};

export default AppWithInspector;
