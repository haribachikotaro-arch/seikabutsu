"use client";

import { extendConfig, extendTheme, type UsageTheme } from "@yamada-ui/react";
import tokens from "./tokens";

const customTheme: UsageTheme = { ...tokens };

export const theme = extendTheme(customTheme)();
export const config = extendConfig({ initialColorMode: "light" });
