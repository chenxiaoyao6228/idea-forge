import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import useRequest from "@ahooksjs/use-request";
import { workspaceApi } from "@/apis/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import useUserStore from "@/stores/user-store";
import useWorkspaceStore, { useFetchWorkspaces } from "@/stores/workspace-store";
import { toast } from "sonner";

const PublicInvitationPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const userInfo = useUserStore((state) => state.userInfo);
  const { run: fetchWorkspaces } = useFetchWorkspaces();
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const redirectRef = useRef(false);
  const fetchedWorkspacesRef = useRef(false);

  const {
    data: invitation,
    loading,
    run: loadInvitation,
  } = useRequest(async (inviteToken: string) => workspaceApi.getPublicInvitationStatus(inviteToken), {
    manual: true,
  });

  const { loading: accepting, run: acceptInvitation } = useRequest(
    async () => {
      if (!token) return;
      return workspaceApi.acceptPublicInvitation(token);
    },
    {
      manual: true,
      onSuccess: async () => {
        toast.success("Invitation accepted");
        await fetchWorkspaces();
        navigate("/");
      },
      onError: () => {
        toast.error("Failed to accept invitation");
      },
    },
  );

  useEffect(() => {
    if (token) {
      loadInvitation(token);
    }
  }, [token, loadInvitation]);

  useEffect(() => {
    if (!token || !userInfo?.id) return;
    loadInvitation(token);
  }, [token, userInfo?.id, loadInvitation]);

  useEffect(() => {
    if (!invitation || invitation.status !== "active") return;
    if (userInfo || redirectRef.current) return;
    redirectRef.current = true;
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    navigate(`/register?redirectTo=${redirectTo}`);
  }, [invitation, userInfo, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!userInfo || fetchedWorkspacesRef.current) return;
    fetchedWorkspacesRef.current = true;
    fetchWorkspaces();
  }, [userInfo, fetchWorkspaces]);

  const statusText = useMemo(() => {
    if (!invitation) return "";
    switch (invitation.status) {
      case "active":
        return "You received a workspace invitation";
      case "expired":
        return "This invitation link has expired";
      default:
        return "Invitation not found";
    }
  }, [invitation]);

  const computedAlreadyMember = useMemo(() => {
    if (!invitation?.workspaceId) return false;
    return Boolean(workspaces[invitation.workspaceId]);
  }, [invitation?.workspaceId, workspaces]);

  const canAccept = invitation?.status === "active" && !invitation?.alreadyMember && !computedAlreadyMember && Boolean(userInfo);

  const workspaceInitial = invitation?.workspaceName?.[0]?.toUpperCase() ?? "W";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <Avatar className="mx-auto h-16 w-16 text-xl">
            <AvatarImage src={invitation?.workspaceAvatar || undefined} />
            <AvatarFallback>{workspaceInitial}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl font-semibold">{loading ? "Loading invitation" : invitation?.workspaceName || "Workspace Invitation"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          {loading ? (
            <Spinner text="Loading invitation" />
          ) : (
            <>
              <p className="text-muted-foreground">{statusText}</p>
              {invitation?.expiresAt && invitation.status === "active" && (
                <p className="text-xs text-muted-foreground">Expires at: {new Date(invitation.expiresAt).toLocaleString()}</p>
              )}
              {invitation?.status === "expired" && (
                <Button variant="outline" onClick={() => navigate("/")}>
                  Back to home
                </Button>
              )}
              {invitation?.status === "invalid" && (
                <Button variant="outline" onClick={() => navigate("/")}>
                  Go to home
                </Button>
              )}
              {invitation?.status === "active" && (invitation.alreadyMember || computedAlreadyMember) && (
                <Button onClick={() => navigate("/")}>Go to workspace</Button>
              )}
              {canAccept && (
                <Button className="w-full" onClick={() => acceptInvitation()} disabled={accepting}>
                  {accepting ? "Joining..." : "Join workspace"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicInvitationPage;
