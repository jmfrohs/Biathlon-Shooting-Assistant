/*
MIT License

Copyright (c) 2026 jmfrohs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

document.addEventListener('DOMContentLoaded', () => {
  translateApp();
  const athletesBtn = document.getElementById('nav-athletes');
  if (athletesBtn)
    athletesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('athletes.html');
    });
  const calendarBtn = document.getElementById('nav-calendar');
  if (calendarBtn)
    calendarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('calendar.html');
    });
  const sessionsBtn = document.getElementById('nav-sessions');
  if (sessionsBtn)
    sessionsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('index.html');
    });
  const analyticsBtn = document.getElementById('nav-analytics');
  if (analyticsBtn)
    analyticsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('analytics.html');
    });
  const menuBtn = document.getElementById('nav-menu');
  if (menuBtn)
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('menu.html');
    });
  const settingsBtn = document.getElementById('nav-settings');
  if (settingsBtn)
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('settings.html');
    });
});
