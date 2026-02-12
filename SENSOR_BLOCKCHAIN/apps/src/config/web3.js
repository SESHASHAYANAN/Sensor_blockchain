import Web3 from 'web3';

const web3 = new Web3('http://localhost:8545'); // or Infura/Alchemy for testnet/mainnet
const contractABI = [0xd9145CCE52D386f254917e481eB44e9943F39138]; // Fill with real ABI
const contractAddress = '0xYourContractAddress';
const contract = new web3.eth.Contract(contractABI, contractAddress);

export { web3, contract };
