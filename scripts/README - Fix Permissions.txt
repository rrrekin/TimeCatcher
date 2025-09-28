🔧 TimeCatcher Permission Fix
=============================

If TimeCatcher won't open due to security restrictions, try these solutions:

SOLUTION 1 (Easiest):
→ Right-click TimeCatcher.app in Applications folder
→ Select "Open" (instead of double-clicking)
→ Click "Open" in the security dialog

SOLUTION 2 (System Settings):
→ Go to System Settings
→ Select "Privacy & Security"
→ Scroll down to "Security" section
→ Click "Open Anyway" next to TimeCatcher

SOLUTION 3 (Terminal):
→ Open Terminal (Applications > Utilities > Terminal)
→ Copy and paste this command:
   xattr -d com.apple.quarantine /Applications/TimeCatcher.app
→ Press Enter

Why is this needed?
TimeCatcher is an open-source project and is not code-signed with an Apple Developer certificate. macOS Gatekeeper blocks unsigned apps by default for security.

Once you've used any of these methods once, TimeCatcher will open normally in the future.

For more help, visit: https://github.com/rrrekin/TimeCatcher