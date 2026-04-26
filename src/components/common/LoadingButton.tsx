/** biome-ignore-all lint/style/noNestedTernary: <-> */
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type LoadingButtonProps = ComponentProps<typeof Button> & {
  loading?: boolean;
  hideContentWhenLoading?: boolean;
};

export default function LoadingButton(props: LoadingButtonProps) {
  const { loading, disabled, children, hideContentWhenLoading, ...rest } =
    props;
  return (
    <Button {...rest} disabled={loading || disabled}>
      {loading && <Spinner />}
      {loading ? (hideContentWhenLoading ? null : children) : children}
    </Button>
  );
}
