import React, { Fragment, useContext, useState, useEffect, useRef } from 'react';
import makeBlockie from 'ethereum-blockies-base64'
import { Link } from 'react-router-dom'
import { Row, Col } from 'reactstrap'
import MetaTags from 'react-meta-tags'

import FeedPoll from '../assets/components/feedpoll';

import { getPolls, getETHPrice } from '../constants/calls/GraphQL'
import { getAuthenicated } from '../constants/calls/REST'
import { store } from '../state'

const dummyData = (issuer, title, body) => ({
  deadline: (parseInt((new Date(Date.now())).getTime()/1000) + 605000).toString(),
  optionAaddr: "0x0",
  optionBaddr: "0x0",
  poll: "0x0",
  id: "0x0",
  issuer,
  body,
  title
})

function Feed() {
  const [ pendingState, setPending ] = useState(false)
  const [ polls, setPolls ] = useState(<span/>)

  let { state, dispatch } = useContext(store)

  function CreatePoll({ show }) {
    const [ component, setComponent ] = useState(<span />)

    function Pending() {
      return (
        <Fragment>
          <div class="pending-state">
            <div class="d-flex justify-content-center">
              <div class="spinner-grow text-primary" role="status" />
            </div>
            <p class="pending-text"> Pending... </p>
          </div>
        </Fragment>
      )
    }

    function Content() {
      const [ d, setDescription ] = useState(null)
      const [ q, setQuestion ] = useState(null)

      const handleDescription = (event) => {
        setDescription(event.target.value)
      }

      const handleQuestion = (event) => {
        setQuestion(event.target.value)
      }

      const submitPoll = async() => {
        await setComponent(<Pending />)
        await createPoll(q, d)
        await setDescription(null)
        await setQuestion(null)
      }

      return (
        <Fragment>
          <div className="poll-profile-hyperlink">
            <Link to={`/profile/${state.accounts[0]}`}>
              <img className='new-poll-profile' src={makeBlockie(state.accounts[0])} />
            </Link>
          </div>
          <div className="create-poll-inputs">
            <input value={q} onChange={handleQuestion} name='question' placeholder='Ask a question' className='create-poll-question feed-q' />
            <textarea name='description' value={d} onChange={handleDescription} placeholder='Description' className='create-poll-description feed-d' />
          </div>
          <button className='btn btn-primary button-poll' onClick={submitPoll}> Create </button>
        </Fragment>
      )
    }

    useEffect(() => {
      setComponent(<Content />)
    }, [ show ])

    return component
  }

  const proofErrors = (question, description) => {
    if((question.length < 4
      || question.length > 100)
      || (description.length > 1000)) {
      if(description.length > 1000){
        document.getElementsByClassName('feed-d')[0]
        .style["border-color"] = "#ff0045"
      } if(question.length < 4
        || question.length > 100){
        document.getElementsByClassName('feed-q')[0]
        .style["border-color"] = "#ff0045"
    }} else {
      if(description.length <= 1000) {
        document.getElementsByClassName('feed-d')[0]
        .style["border-color"] = "#2B3553"
      } if(question.length <= 100
       && question.length >= 4){
        document.getElementsByClassName('feed-q')[0]
        .style["border-color"] = "#2B3553"
      }
    }
  }

  const createPoll = async(title, body) => {
    await setPending(true)
    await dummyPoll('0x0', title, body)
    await transactionAlert({
      transactionHash: '0x0'
    })
  }

  const onHash = async(hash, title, body) => {
    await setPending(true)
    await dummyPoll(hash, title, body)
  }

  const transactPoll = async(question, description) => {
    let { web3, instance, accounts } = state

    if(question.length >= 4
      && question.length <= 100
      && description.length <= 1000){
      const recentBlock = await web3.eth.getBlock('latest')
      const deadline = recentBlock.timestamp + 605000

      proofErrors(question, description)

      await instance.methods.newVoteProposal(
        question,
        description,
        deadline
      ).send({
        from: accounts[0]
      }).on('confirmation', async(confNum, receipt) => {
        await transactionAlert(receipt)
      }).on('transactionHash', async(hash) => {
        await onHash(hash, question, description)
      })
      } else {
      proofErrors(question, description)
    }
  }

  const transactionAlert = async(receipt) => {
    let message = receipt.transactionHash
    let label = ''

    await pluckDummy(receipt)

    if(receipt.status == 1) {
      await retrievePolls()
      label = 'success'
    } else {
      label = 'warning'
    }
  }

  const dummyPoll = (hash, title, description) => {
    let { polls, accounts } = state
    let neophyte = {}

    polls[hash] = {
      ...dummyData(accounts[0], title, description)
    }

    neophyte = Object.entries(polls).sort((a, b) => {
      return b[1].deadline - a[1].deadline
    })

    polls = {}

    neophyte.forEach(value => polls[value[0]] = value[1])

    dispatch({
      payload: { polls },
      type: 'INIT'
    })
  }

  const pluckDummy = (receipt) => {
    let { polls } = state

    delete polls[receipt.transactionHash]

    dispatch({
      payload: { polls },
      type: 'INIT'
    })
  }

  const retrievePolls = async() => {
    var authenicated = await getAuthenicated()
    var price = await getETHPrice()
    var polls = await getPolls()

    dispatch({
      payload: {
        authenicated, polls, price
      },
      type: 'INIT'
    })
  }

  useEffect(() => {
    setPolls(
      Object.keys(state.polls)
        .map((id, index) => (
          <FeedPoll key={id} id={id}/>
      ))
    )
  }, [ state.polls ])

  useEffect(() => {

  }, [])

  return (
    <Fragment>
      <MetaTags>
        <title>Burn Signal</title>
        <meta property='og:title' content='Burn Signal' />
        <meta property='og:description' content='Got an opinion? Burn ETH to prove it.' />
        <meta property='twitter:title' content='Burn Signal' />
        <meta property='twitter:description' content='Got an opinion? Burn ETH to prove it.' />
      </MetaTags>
      {state.web3 && (
        <div className='new-poll'>
          <Row>
            <Col sm='12' md={{ size: 6, offset: 3 }}>
              <div className='card'>
                <div className='card-header' />
                <div className='card-body'>
                  <CreatePoll show={pendingState} />
                </div>
              </div>
            </Col>
          </Row>
        </div>
      )}
      {polls}
    </Fragment>
  )
}

export default Feed
