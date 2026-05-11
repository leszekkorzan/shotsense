import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { clearAllData } from "@/lib/db/db-helpers";
import LoadingButton from "../common/LoadingButton";

export default function DangerZoneSettings() {
  const [isChecked, setIsChecked] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleDelete = async () => {
    setIsRemoving(true);

    try {
      await clearAllData("DELETE");
    } catch {
      toast.error("Wystąpił błąd podczas usuwania danych.");
    } finally {
      setIsRemoving(false);
      toast.success("Wszystkie dane zostały usunięte z urządzenia.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset danych</CardTitle>
        <CardDescription>
          Uwaga! Poniższe działania są nieodwracalne.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        <AlertDialog onOpenChange={() => setIsChecked(false)}>
          <AlertDialogTrigger asChild>
            <LoadingButton loading={isRemoving} variant="destructive">
              Usuń wszystkie dane z urządzenia
            </LoadingButton>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset danych</AlertDialogTitle>
              <AlertDialogDescription>
                Ta operacja jest nieodwracalna i spowoduje utratę wszystkich
                zapisanych informacji na urządzeniu. Upewnij się, że masz kopię
                zapasową ważnych danych przed kontynuacją.
                <div className="mt-4 rounded-lg border border-dashed p-2">
                  <FieldGroup>
                    <Field orientation="horizontal">
                      <Checkbox
                        checked={isChecked}
                        id="confirmation-checkbox"
                        name="confirmation-checkbox"
                        onCheckedChange={(set) => setIsChecked(set === true)}
                      />
                      <FieldLabel htmlFor="confirmation-checkbox">
                        Jestem świadomy działań
                      </FieldLabel>
                    </Field>
                  </FieldGroup>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                disabled={!isChecked}
                onClick={handleDelete}
                variant="destructive"
              >
                Usuń dane
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
