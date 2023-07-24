# Development

1. Install dependencies `npm install`
2. Copy `.env.example` to `.env` (if it doesn't exist)
3. Set correct `COMPUTER_ID` and `API_URL`
4. Start app in dev mode `npm run dev`

# Production

1. Run build `npm run build`
2. Run `API_URL=*** npm run package` - it will package windows app installer with presented `API_URL`, sources will be into asar file
3. Install and start packaged app `build\dist\booking_desktop Setup 0.0.1.exe`

# Information about NSIS

NSIS (Nullsoft Scriptable Install System) is a system to create Windows installers which `electron-builder` uses by default.

NSIS Dialog Designer is an IDE that provides a graphical tool to easily design custom setup pages for the NSIS.

- [NSIS page](https://nsis.sourceforge.io/Main_Page)
- [NSIS Dialog Designer page](https://nsis.sourceforge.io/NSIS_Dialog_Designer)

NSIS system configures via `build.nsis` field in `package.json` ([about this](https://www.electron.build/configuration/nsis)) and `.nsh` scripts in `installer-resources` directory.

The directory hierarchy is described below:

1. `installer.nsh` - entry point, here all modules are imported in order of dependence on each other (like PHP `include`). All logic must be in the [installer hooks](https://www.electron.build/configuration/nsis#custom-nsis-script)
2. `dialog.nsh` - a module describes a custom dialog window with custom inputs. We also have the directory `nsis-dialog-project` which stores the 'NSIS Dialog Designer' project
3. All other `.nsh` files are functional modules which copied from the NSIS page:
   - [`config-read.nsh`](https://nsis.sourceforge.io/ConfigRead) - function to read config files
   - [`enumerate-users.nsh`](https://nsis.sourceforge.io/User_Management_using_API_calls#Enumerate_all_users) - function to enumerate users to array (depends on `Plugins/NSISArray.dll` plugin).
   - [`replace-in-file.nsh`](https://nsis.sourceforge.io/ReplaceInFile) - function to read file and replace a string in this file (depends on `str-rep.nsh`)
   - [`str-rep.nsh`](https://nsis.sourceforge.io/StrRep) - function to replace a substring in a string
4. `start_overlay.xml` - [extra resource](https://www.electron.build/configuration/configuration#PlatformSpecificBuildOptions-extraResources) (sheduler task) which is packaged into the installer binary
5. `Plugins` - directory where binary plugins are stored
