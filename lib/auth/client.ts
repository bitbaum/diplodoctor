"use client";

import { authClientPlugins } from "@bitbaum/accountkit/auth/client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ plugins: authClientPlugins() });
