@rem SPDX-License-Identifier: Apache-2.0
@if "%DEBUG%"=="" @echo off
@setlocal

set DIR=%~dp0
set APP_HOME=%DIR%

set DEFAULT_JVM_OPTS=

set JAVA_EXE=java.exe
if defined JAVA_HOME set JAVA_EXE=%JAVA_HOME%\bin\java.exe

"%JAVA_EXE%" %DEFAULT_JVM_OPTS% -classpath "%APP_HOME%\gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*

@endlocal