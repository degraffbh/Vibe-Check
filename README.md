# 🎵 Vibe Check

A collaborative music jukebox program that allows users to listen to music together.

## 🚀 Specification Deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] Proper use of Markdown
- [x] A concise and compelling elevator pitch
- [x] Description of key features
- [x] Description of how you will use each technology
- [x] One or more rough sketches of your application. Images must be embedded in this file using Markdown image references.

### Elevator pitch

Do you and your friends like music but you all want to play your own songs? Our application Vibe Check will allow you and your friends to share and listen to music together with a real-time global jukebox where users vote on the next song to be played in a public digital space. It’s a live democracy for background music. Users can serach for songs to add to the digital que, and users can upvote and downvote songs to be played next. It keeps things fair and concise and allows everyone to enjoy music together. 

### Design

<img width="869" height="357" alt="diagramcs" src="https://github.com/user-attachments/assets/fe20e9ef-32f9-4117-b32f-861cd965b9d0" />

### Key features

- Login and account system
- Ability to search up songs using Youtube API
- Ability to upvove and downvote songs
- Ability to chat with others online

### Technologies

I am going to use the required technologies in the following ways.

- **HTML** - Uses correct HTML structure for application. Three HTML pages. One for login, one for the jukebox, and one for about me. 
- **CSS** - Application styling that looks good on different screen sizes, uses good whitespace, color choice and contrast.
- **React** - Highly reactive UI that will animate song cards as they shuffle positions in the queue based on WebSocket data, as well as the react-youtube library will allow songs to be searched and played. 
- **Service** - Backend server will act as a middleman between your React app and Google’s servers, and contains endpoints for login, songs, upvotes, and downvotes. 
- **DB/Login** - Store users, songs, and votes in database. Register and login users. Credentials securely stored in database. Can't use jukebox unless authenticated.
- **WebSocket** - As each user as adds songs or upvotes/downvotes a song, it is displayed to all users. 

## 🚀 AWS deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] **Server deployed and accessible with custom domain name** - [My server link](https://vibecheckjukebox.click).

## 🚀 HTML deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] **HTML pages** - I did complete this part of the deliverable.
- [x] **Proper HTML element usage** - I did complete this part of the deliverable.
- [x] **Links** - I did complete this part of the deliverable.
- [x] **Text** - I did complete this part of the deliverable.
- [x] **3rd party API placeholder** - I did complete this part of the deliverable.
- [x] **Images** - I did complete this part of the deliverable.
- [x] **Login placeholder** - I did complete this part of the deliverable.
- [x] **DB data placeholder** - I did complete this part of the deliverable.
- [x] **WebSocket placeholder** - I did complete this part of the deliverable.

## 🚀 CSS deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] **Visually appealing colors and layout. No overflowing elements.** - I completed this part of the deliverable by using a background gradient and using a purple vibe theme, as well as making sure everything had propper padding and margins.
- [x] **Use of a CSS framework** - I completed this part of the deliverable by using Bootstrap buttons. 
- [x] **All visual elements styled using CSS** - I completed this part of the deliverable by having all of my html styled with css. 
- [x] **Responsive to window resizing using flexbox and/or grid display** - I completed this part of the deliverable by using flexbox display for the majoirty of my css as well as a bit of grid display. 
- [x] **Use of a imported font** - I completed this part of the deliverable by using an imported font for the name of the website, as well as some imported fonts for the about section. 
- [x] **Use of different types of selectors including element, class, ID, and pseudo selectors** - I completed this part of the deliverable by using these selecters thoughout my code to be able to use css properly. 

## 🚀 React part 1: Routing deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] **Bundled using Vite** - I used vite to bundle my code
- [x] **Components** - I used multiple react components that represents all of the previous HTML/CSS
- [x] **Router** - I used react routers to make it so users can visit all my pages of my website 

## 🚀 React part 2: Reactivity deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] **All functionality implemented or mocked out** - I did complete this part of the deliverable. Chat, Song Player, and Global Queue react all coded as well as the Login react. Placeholders are used for the artist/thumbnials/actual searching feature because I need the Youtube Iplayer API and the Youtube Search API for those to work. The join jukebox button makes it so you can hear the music playing and right now it's just set to a default song whenever you add a song to the global queue. 
- [x] **Hooks** - I did complete this part of the deliverable. I used react useState and useEffect hooks.

## 🚀 Service deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] **Node.js/Express HTTP service** - I did not complete this part of the deliverable.
- [ ] **Static middleware for frontend** - I did not complete this part of the deliverable.
- [ ] **Calls to third party endpoints** - I did not complete this part of the deliverable.
- [ ] **Backend service endpoints** - I did not complete this part of the deliverable.
- [ ] **Frontend calls service endpoints** - I did not complete this part of the deliverable.
- [ ] **Supports registration, login, logout, and restricted endpoint** - I did not complete this part of the deliverable.

## 🚀 DB deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] **Stores data in MongoDB** - I did not complete this part of the deliverable.
- [ ] **Stores credentials in MongoDB** - I did not complete this part of the deliverable.

## 🚀 WebSocket deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] **Backend listens for WebSocket connection** - I did not complete this part of the deliverable.
- [ ] **Frontend makes WebSocket connection** - I did not complete this part of the deliverable.
- [ ] **Data sent over WebSocket connection** - I did not complete this part of the deliverable.
- [ ] **WebSocket data displayed** - I did not complete this part of the deliverable.
- [ ] **Application is fully functional** - I did not complete this part of the deliverable.
