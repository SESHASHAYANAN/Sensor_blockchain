const fs = require('fs');
const path = require('path');
const solc = require('solc');
const Web3 = require('web3');

const web3 = new Web3('http://localhost:8545');

const contractPath = path.resolve(__dirname, '../contracts', 'HealthData.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'HealthData.sol': {
            content: source,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*'],
            },
        },
    },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contractFile = output.contracts['HealthData.sol']['HealthData'];
const bytecode = contractFile.evm.bytecode.object;
const abi = contractFile.abi;

(async () => {
    try {
        const accounts = await web3.eth.getAccounts();
        const deployer = accounts[0];

        console.log('Deploying from:', deployer);

        const contract = new web3.eth.Contract(abi);

        const deployedContract = await contract
            .deploy({ data: bytecode })
            .send({ from: deployer, gas: 1500000, gasPrice: '30000000000' });

        console.log('Contract Address:', deployedContract.options.address);
        fs.writeFileSync(path.resolve(__dirname, '../contract_address.txt'), deployedContract.options.address);
        fs.writeFileSync(path.resolve(__dirname, '../contract_abi.json'), JSON.stringify(abi, null, 2));

        console.log('Contract deployed successfully! You can now run the backend and frontend.');
        process.exit(0);
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
})();
