import { createContext, useContext } from "react";
export const DemoSessionContext = createContext({
  active: false,
  enter: () => {},
  leave: () => {},
});
export function useDemoSession() {
  return useContext(DemoSessionContext);
}
