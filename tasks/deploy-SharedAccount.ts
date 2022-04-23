import '@nomiclabs/hardhat-ethers';
import fs from 'fs';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  SharedAccount__factory,
} from '../typechain-types';
import { deployWithVerify, waitForTx } from './helpers/utils';

export let runtimeHRE: HardhatRuntimeEnvironment;

/**
 * @dev Note that this script uses the default ethers signers.
 * Care should be taken to also ensure that the following addresses end up properly set:
 *    1. LensHub Proxy Admin
 *    2. LensHub Governance
 *    3. ModuleGlobals Governance
 *    3. ModuleGlobals Treasury
 *
 * Furthermore, This script does not whitelist profile creators or deploy a profile creation
 * proxy or a unique currency contract. This also does not whitelist any currencies in the
 * ModuleGlobals contract.
 */
task('deploy-SharedAccount', 'deploys the Shared Account').setAction(
  async ({}, hre) => {
    // Note that the use of these signers is a placeholder and is not meant to be used in
    // production.
    runtimeHRE = hre;
    const ethers = hre.ethers;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    // Nonce management in case of deployment issues
    let deployerNonce = await ethers.provider.getTransactionCount(deployer.address);

    // Deploy Shared Account
    console.log('\n\t-- Deploying Shared Account--');
    const sharedAccount = await deployWithVerify(
      new SharedAccount__factory(deployer).deploy(
        "0x03dE2c5Dd914a1D8F94D57741D531874D30F5299",
        accounts[0].address,
        "0x7f661e9f547aCc38D413a63E16E03C3247f9a72D",
        {
          nonce: deployerNonce++,
        }),
        ["0x03dE2c5Dd914a1D8F94D57741D531874D30F5299", accounts[0].address, "0x7f661e9f547aCc38D413a63E16E03C3247f9a72D"],
      'contracts/misc/SharedAccount.sol:SharedAccount'
    );

    // Save and log the addresses
    const addrs = {
      'Shared Account': sharedAccount.address
    };
    const json = JSON.stringify(addrs, null, 2);
    console.log(json);

    fs.writeFileSync('addresses.json', json, 'utf-8');
  }
);
