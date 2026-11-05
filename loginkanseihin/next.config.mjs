/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  modularizeImports: {
    '@yamada-ui/react': {
      skipDefaultConversion: true,
      transform: {
        Box: '@yamada-ui/layouts',
        Container: '@yamada-ui/layouts',
        Flex: '@yamada-ui/layouts',
        FlexProps: '@yamada-ui/layouts',
        Grid: '@yamada-ui/layouts',
        Separator: '@yamada-ui/layouts',
        Heading: '@yamada-ui/typography',
        Text: '@yamada-ui/typography',
        Alert: '@yamada-ui/alert',
        Button: '@yamada-ui/button',
        ButtonProps: '@yamada-ui/button',
        IconButton: '@yamada-ui/button',
        FormControl: '@yamada-ui/form-control',
        Input: '@yamada-ui/input',
        PasswordInput: '@yamada-ui/password-input',
        Drawer: '@yamada-ui/modal',
        DrawerBody: '@yamada-ui/modal',
        DrawerHeader: '@yamada-ui/modal',
        useDisclosure: '@yamada-ui/use-disclosure',
        UIProvider: '@yamada-ui/providers',
        ColorModeScript: '@yamada-ui/core',
        UsageTheme: '@yamada-ui/core',
        ThemeTokens: '@yamada-ui/core',
        extendConfig: '@yamada-ui/theme-tools',
        extendTheme: '@yamada-ui/theme-tools',
      },
    },
  },
};

export default nextConfig;
