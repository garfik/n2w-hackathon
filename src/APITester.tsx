import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/authClient";

export function APITester() {
  const responseInputRef = useRef<HTMLTextAreaElement>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");

  const setOutput = (text: string) => {
    if (responseInputRef.current) responseInputRef.current.value = text;
  };

  const testEndpoint = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const endpoint = formData.get("endpoint") as string;
      const url = new URL(endpoint, location.href);
      const method = formData.get("method") as string;
      const res = await fetch(url, { method });
      const data = await res.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (error) {
      setOutput(String(error));
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setOutput("Signing up...");
    try {
      const res = await authClient.signUp.email({
        email: authEmail,
        password: authPassword,
        name: authName || (authEmail.split("@")[0] ?? "User"),
      });
      if (res.error) {
        setOutput(JSON.stringify({ ok: false, error: res.error }, null, 2));
        return;
      }
      setOutput(JSON.stringify({ ok: true, data: res.data }, null, 2));
    } catch (err) {
      setOutput(String(err));
    }
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setOutput("Signing in...");
    try {
      const res = await authClient.signIn.email({
        email: authEmail,
        password: authPassword,
      });
      if (res.error) {
        setOutput(JSON.stringify({ ok: false, error: res.error }, null, 2));
        return;
      }
      setOutput(JSON.stringify({ ok: true, data: res.data }, null, 2));
    } catch (err) {
      setOutput(String(err));
    }
  };

  const handleSignOut = async () => {
    setOutput("Signing out...");
    try {
      const res = await authClient.signOut();
      if (res.error) {
        setOutput(JSON.stringify({ ok: false, error: res.error }, null, 2));
        return;
      }
      setOutput(JSON.stringify({ ok: true }, null, 2));
    } catch (err) {
      setOutput(String(err));
    }
  };

  const handleGetMe = async () => {
    setOutput("Fetching /api/me...");
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      setOutput(String(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Auth: email/password form + actions */}
      <div className="rounded-lg border p-4 space-y-3">
        <Label className="text-sm font-medium">Auth (email + password)</Label>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <Label htmlFor="auth-email" className="text-xs sr-only">Email</Label>
            <Input
              id="auth-email"
              type="email"
              placeholder="email@example.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="auth-password" className="text-xs sr-only">Password</Label>
            <Input
              id="auth-password"
              type="password"
              placeholder="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-32"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="auth-name" className="text-xs sr-only">Name (optional)</Label>
            <Input
              id="auth-name"
              type="text"
              placeholder="Name"
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              className="w-28"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="default" onClick={handleSignUp}>Sign Up</Button>
          <Button type="button" variant="secondary" onClick={handleSignIn}>Sign In</Button>
          <Button type="button" variant="outline" onClick={handleSignOut}>Sign Out</Button>
          <Button type="button" variant="outline" onClick={handleGetMe}>Get Me</Button>
        </div>
      </div>

      {/* Generic API tester */}
      <form onSubmit={testEndpoint} className="flex items-center gap-2">
        <Label htmlFor="method" className="sr-only">Method</Label>
        <Select name="method" defaultValue="GET">
          <SelectTrigger className="w-[100px]" id="method">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
          </SelectContent>
        </Select>
        <Label htmlFor="endpoint" className="sr-only">Endpoint</Label>
        <Input id="endpoint" type="text" name="endpoint" defaultValue="/api/hello" placeholder="/api/hello" />
        <Button type="submit" variant="secondary">Send</Button>
      </form>

      <Label htmlFor="response" className="sr-only">Response</Label>
      <Textarea
        ref={responseInputRef}
        id="response"
        readOnly
        placeholder="Response will appear here..."
        className="min-h-[140px] font-mono resize-y"
      />
    </div>
  );
}
