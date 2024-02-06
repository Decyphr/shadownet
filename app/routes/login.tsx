import { Form, Link } from "@remix-run/react";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export default function LoginPage() {
  return (
    <div className="w-full h-screen bg-background flex flex-col justify-center items-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-thin">Login</CardTitle>
          <CardDescription>
            Need an account? <Link to="/sign-up">Sign up here.</Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form className="w-full max-w-md space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="sr-only">
                Username
              </Label>
              <Input type="text" id="email" name="email" placeholder="Email" />

              <Label htmlFor="password" className="sr-only">
                Password
              </Label>
              <Input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" />
                <Label
                  htmlFor="remember-me"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </Label>
              </div>
              <Link to="/forgot-password" className="text-sm">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
