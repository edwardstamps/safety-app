import React, { Component } from 'react'
import './App.css'
import Modal  from 'react-modal'
import client from '@doubledutch/admin-client'
import CustomMessages from './CustomMessages'
import List from './List'
import CustomModal from './Modal'
import FirebaseConnector from '@doubledutch/firebase-connector'
import {CSVLink, CSVDownload} from 'react-csv';
const fbc = FirebaseConnector(client, 'safety-check-app')
fbc.initializeAppWithSimpleBackend()

class App extends Component {
  constructor() {
    super()
    this.state = { 
      active: false,
      showButtons: false,
      status: [], 
      check: "", 
      safeUsers: [],
      unknownUsers : [],
      ooaUsers: [],
      allUsers: [],
      exportList: false,
      openVar: false,
     }
    this.signin = fbc.signinAdmin()
      .then(user => this.user = user)
      .catch(err => console.error(err))
  }

  componentDidMount() {

    this.signin.then(() => {
      client.getUsers().then(users => {
      this.setState({allUsers: users, unknownUsers: users})
      const sharedRef = fbc.database.public.adminRef("checks")
      const adminableRef = fbc.database.private.adminableUsersRef()
    
      sharedRef.on('child_added', data => {
        this.setState({ check: {...data.val(), key: data.key}, active: true, showButtons: true })
      })

      adminableRef.on('child_added', data => {
          var newUser = this.state.unknownUsers.filter(newUser => 
            newUser.id === data.key
          )
          var newList = this.state.unknownUsers.filter(newUser => 
            newUser.id !== data.key
          )
          if (data.val().status === "safe"){
            newUser[0].status = "safe"
            this.setState({ safeUsers: this.state.safeUsers.concat(newUser), unknownUsers: newList, active: true})
          }
          if (data.val().status === "OOA"){
            newUser[0].status = "OOA"
            this.setState({ ooaUsers: this.state.safeUsers.concat(newUser), unknownUsers: newList, active: true})
          }
      })

      adminableRef.on('child_changed', data => {
          var newUser = this.state.unknownUsers.filter(newUser => 
            newUser.id === data.key
          )
          var newList = this.state.unknownUsers.filter(newUser => 
            newUser.id !== data.key
          )
          if (data.val() === "safe"){
            newUser[0].status = "safe"
            this.setState({ safeUsers: this.state.safeUsers.concat(newUser), unknownUsers: newList, active: true})
          }
          if (data.val() === "OOA"){
            newUser[0].status = "OOA"
            this.setState({ ooaUsers: this.state.safeUsers.concat(newUser), unknownUsers: newList, active: true})
          } 
      })

      sharedRef.on('child_removed', data => {
        this.setState({ check: "", currentStatus: false, showButtons: false})
      }) 
    })
  })
    .catch(err => console.error(err)) 
  }

  render() {
    return (
      <div className="App">
        <CustomModal
        openVar = {this.state.openVar}
        closeModal = {this.closeModal}
        startCheck = {this.startCheck}
        endCheck = {this.endCheck}
        active = {this.state.showButtons}
        makeExport = {this.makeExport}
        />
        <div className="topBox">
          <p className='bigBoxTitle'>{'Safety Check'}</p>
          {this.showActivate()}
          {this.showCSV()}
        </div>
        <CustomMessages
        active = {this.state.showButtons}
        />
        {this.showActiveCheck()}
        {this.runCSV()}
      </div>
    )
  }

  runCSV = (list) => {
    if (this.state.exportList){
      return(
      <div>
        <CSVDownload className="modalExport1" data={this.state.unknownUsers} separator={";"}>Export to CSV</CSVDownload>
        <CSVDownload className="modalExport1" data={this.state.safeUsers} separator={";"}>Export to CSV</CSVDownload>
        <CSVDownload className="modalExport1" data={this.state.ooaUsers} separator={";"}>Export to CSV</CSVDownload>
        {this.setState({exportList: false})}
      </div>
      )
    }
  }

  showActiveCheck = () => {
    if (this.state.active) {
      return (    
        <div className="statusesBox">
          <List
          listData = {this.state.unknownUsers}
          listName = {"Not Checked In"}
          /> 
          <List
          listData = {this.state.safeUsers}
          listName = {"Marked As Safe"}
          />
          <List
          listData = {this.state.ooaUsers}
          listName = {"Not in Area"}
          />
        </div>
      )
    }
  }

  showActivate = () => {
    if (this.state.showButtons) {
      return (
        <button className="qaButtonOff" onClick={this.endCheck}>Deactivate Safety Check</button>
      )
    }
    else {
      return(
        <button className="qaButton" onClick={this.openModal}>Activate Safety Check</button>
      )
    }
  }

  showCSV = () => {
    if (this.state.active){
      return (
        <button className="csvButton" style={{marginLeft: 10}}onClick={this.makeExport}>Export Lists to CSV</button>
      )
    }
  }

  startCheck = () => {
    this.setState({active: true, check: [], ooaUsers: [], safeUsers: [], unknownUsers: this.state.allUsers, openVar: false, showButtons: true})
    fbc.database.private.adminableUsersRef().remove()
    .catch (x => console.error(x))
    fbc.database.public.adminRef('checks').push(true)
    .catch (x => console.error(x))
  }

  endCheck = () => {
    var mod = this.state.check
    fbc.database.public.adminRef('checks').child(mod.key).remove()
    .catch (x => console.error(x))
    this.openModal()
  }

  makeExport = () => {
    this.setState({openVar: false, exportList: true});
    this.closeModal()
  }


  openModal = () => {
    this.setState({openVar: true})
  }

  closeModal = () => {
    this.setState({openVar: false});
  }

  markComplete(task) {
    fbc.database.public.allRef('tasks').child(task.key).remove()
  }
}


export default App
