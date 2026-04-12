#ifndef AppVersion
  #error AppVersion define is required.
#endif

#ifndef PortableSourceDir
  #error PortableSourceDir define is required.
#endif

#ifndef OutputDir
  #define OutputDir "..\..\release"
#endif

#define AppName "Signaler CLI"
#define AppPublisher "Signaler Team"
#define InstallRoot "{localappdata}\signaler"
#define CurrentDir "{localappdata}\signaler\current"
#define BinDir "{localappdata}\signaler\bin"

[Setup]
AppId={{D1E55F5A-6D19-4F20-A31B-9E5A7F8D3124}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={#InstallRoot}
DisableDirPage=yes
DisableProgramGroupPage=yes
UninstallDisplayIcon={#CurrentDir}\signaler.cmd
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
Compression=lzma
SolidCompression=yes
OutputDir={#OutputDir}
OutputBaseFilename=signaler-{#AppVersion}-windows-setup
WizardStyle=modern
ChangesEnvironment=yes

[Dirs]
Name: "{#InstallRoot}"
Name: "{#CurrentDir}"
Name: "{#BinDir}"

[Files]
Source: "{#PortableSourceDir}\*"; DestDir: "{#CurrentDir}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
Filename: "{cmd}"; Parameters: "/c node --version"; StatusMsg: "Checking Node.js..."; Flags: runhidden waituntilterminated; Check: NodeIsInstalled
Filename: "{cmd}"; Parameters: "/c npm.cmd install --omit=dev --ignore-scripts --no-audit --no-fund"; WorkingDir: "{#CurrentDir}"; StatusMsg: "Installing runtime dependencies..."; Flags: waituntilterminated

[Code]
function HasCommand(command: string): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec(ExpandConstant('{cmd}'), '/c where ' + command, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function NodeIsInstalled: Boolean;
begin
  Result := HasCommand('node');
  if not Result then begin
    MsgBox('Node.js 18 or newer is required to install Signaler.', mbCriticalError, MB_OK);
  end;
end;

function PathContains(Entry: string): Boolean;
var
  ExistingPath: string;
begin
  ExistingPath := GetEnv('Path');
  Result := Pos(Lowercase(Entry), Lowercase(ExistingPath)) > 0;
end;

procedure AddPathEntry;
var
  ExistingPath: string;
  NewPath: string;
begin
  ExistingPath := GetEnv('Path');
  if not PathContains(ExpandConstant('{#BinDir}')) then begin
    if ExistingPath = '' then
      NewPath := ExpandConstant('{#BinDir}')
    else
      NewPath := ExistingPath + ';' + ExpandConstant('{#BinDir}');
    SetEnv('Path', NewPath);
    RegWriteExpandStringValue(HKCU, 'Environment', 'Path', NewPath);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then begin
    AddPathEntry;
  end;
end;
