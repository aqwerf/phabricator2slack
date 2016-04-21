# Setup
* Copy config.js.sample to config.js
* Set the configuration parameter in config.js
* run npm install
  ```sh
  $ npm install
  ```
* run index.js with nodemon or not.
  ```sh
  $ npm install -g nodemon
  $ nodemon index.js
  ```

# Note
* Phabricator username should be same as slack username.
* If 'alan' add a comment in maniphest task, it send slack message like this..
  ```
  [Alan's Icon] alanbot  14:50PM
  added a commenet to T1234: Problem issue...
  @james, @kevin, @peter   <= all subscribers in this task
  | This is sample comments.
  | @james: Hellow
  ```
* If you mention someone in a comment, then it also send DM to them memtioned.

