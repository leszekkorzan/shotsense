import React, { createContext } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export const AlertDialogContext = createContext<
  (params: ConfirmAction) => Promise<boolean>
>(() => Promise.resolve(false));

export type ConfirmAction = {
  type: "confirm";
  description?: string;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  onConfirm?: () => boolean | Promise<boolean> | void | Promise<void>;
};

type AlertDialogState = {
  open: boolean;
  description?: string;
};

export function alertDialogReducer(
  state: AlertDialogState,
  action: ConfirmAction | { type: "close" }
): AlertDialogState {
  switch (action.type) {
    case "close":
      return { ...state, open: false };
    case "confirm":
      return {
        ...state,
        open: true,
        description: action.description,
      };
    default:
      return state;
  }
}

export function AlertDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = React.useReducer(alertDialogReducer, {
    open: false,
    description: undefined,
  });

  const resolveRef = React.useRef<((value: boolean) => void) | undefined>(
    undefined
  );

  const currentActionRef = React.useRef<ConfirmAction | undefined>(undefined);

  function close() {
    dispatch({ type: "close" });
    resolveRef.current?.(false);
  }

  function confirm() {
    const action = currentActionRef.current;

    if (action?.onConfirm) {
      const cb = action.onConfirm;
      Promise.resolve()
        .then(() => cb())
        .then((res) => {
          if (res === false) {
            dispatch({ type: "close" });
            resolveRef.current?.(false);
          } else {
            dispatch({ type: "close" });
            resolveRef.current?.(true);
          }
          currentActionRef.current = undefined;
        })
        .catch(() => {
          dispatch({ type: "close" });
          resolveRef.current?.(false);
          currentActionRef.current = undefined;
        });
      return;
    }

    dispatch({ type: "close" });
    resolveRef.current?.(true);
    currentActionRef.current = undefined;
  }

  const dialog = React.useCallback((params: ConfirmAction) => {
    currentActionRef.current = params;
    dispatch(params);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  return (
    <AlertDialogContext.Provider value={dialog}>
      {children}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            close();
            return;
          }
        }}
        open={state.open}
      >
        <AlertDialogContent asChild>
          <div>
            <AlertDialogHeader>
              <AlertDialogTitle>Potwierdzenie operacji</AlertDialogTitle>
              {state.description ? (
                <AlertDialogDescription>
                  {state.description}
                </AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <Button onClick={close} type="button" variant="outline">
                Anuluj
              </Button>
              <Button
                onClick={confirm}
                variant={currentActionRef.current?.confirmVariant}
              >
                Potwierdź
              </Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AlertDialogContext.Provider>
  );
}

export function useConfirm() {
  const dialog = React.useContext(AlertDialogContext);

  return React.useCallback(
    (params: Omit<ConfirmAction, "type"> | string) =>
      dialog(
        typeof params === "string"
          ? { type: "confirm" }
          : { type: "confirm", ...(params as Omit<ConfirmAction, "type">) }
      ),
    [dialog]
  );
}
