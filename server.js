const express = require('express')
const { GraphQLClient, gql } = require('graphql-request')

function addIPFSProxy(ipfsHash) {
  const ipfsURL = ipfsHash.replace(/^ipfs?:\/\//, 'https://ipfs.io/ipfs/')
  return ipfsURL
}

const queryNft = gql`
query getAccountNfts($id: ID, $skip: Int) {
  accounts(where: {id: $id}) {    
    tokens(first: 100, skip: $skip) {
      id
      tokenURI
      collection {
        id
        name
        symbol
        totalSupply
      }
    }
    }
}`;

const queryCollection = gql`
query allCollections($skip: Int) {
  collections(first: 20, skip: $skip) {
    id
    mintPrice
    name
    supportsMetadata
    symbol
    totalSupply
    totalSales
    topSale
    totalVolume
  }
}`;

const endpoint = 'http://162.0.216.193:8000/subgraphs/name/shadowswap/listnfts'
const graphQLClient = new GraphQLClient(endpoint)


const cors = require('cors');
const app = express()
app.use(cors());

const port = 3000
app.get('/nfts', async (req, res) => {
  const nftArr = []
  try {
    if (!req) return res.send({ error: "query required" })
    if (!req.query) return res.send({ error: "query required" })
    if (!req.query.address) return res.send({ error: "address required" })
  
    let skip = 0
    let page = req?.query?.page || 0
    skip = page * 100

    const data = await graphQLClient.request(queryNft,
      { id: req.query.address.toLowerCase(), skip })
      
    if(data.accounts.length > 0 && data.accounts[0].tokens.length > 0){
      for(let i = 0; i < data.accounts[0].tokens.length; i++){
        const token = data.accounts[0].tokens[i];
        const tokenObj = {}
        tokenObj.id = token.id.split('/')[2]
        tokenObj.name = token.collection.name
        tokenObj.symbol = token.collection.symbol
        tokenObj.ca = token.collection.id
        const tokenURI = token.tokenURI
        const ipfsURL = addIPFSProxy(tokenURI);
        const request = new Request(ipfsURL);
        const response = await fetch(request);
        const metadata = await response.json();
        const image = addIPFSProxy(metadata.image);
        tokenObj.img = image
        nftArr.push(tokenObj)
      }
    }
  } catch (error) {
    console.log(error);
  }

  return res.send(nftArr)
})

app.get('/collections', async (req, res) => {
  const collectionArr = []
  let skip = 0
  let page = req?.query?.page || 0
  skip = page * 100
  try {
    
    const data = await graphQLClient.request(queryCollection, { skip })
    return res.send(data)
  } catch (error) {
    console.log(error);
  }

  return res.send(collectionArr)
})

app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})