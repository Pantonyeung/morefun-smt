# Sunmi T2s white-screen compatibility fix

The first APK artifact was structurally valid and correctly signed, but its Vite output only shipped an ES-module entry point and used root-absolute asset URLs. Older Sunmi T2s Android System WebView versions may ignore or fail to parse the module bundle, resulting in a blank application surface.

This fix emits a legacy nomodule bundle and polyfills, targets Chrome/WebView 49 compatibility, and uses relative asset URLs for the Capacitor local origin.
