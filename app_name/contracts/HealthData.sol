// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HealthData {
    struct HealthRecord {
        string patientId;
        uint256 heartRate;
        uint256 spO2;
        uint256 timestamp;
    }

    mapping(string => HealthRecord[]) private healthRecords;
    mapping(address => bool) public authorizedUsers;

    event HealthDataAdded(string patientId, uint256 heartRate, uint256 spO2, uint256 timestamp);

    modifier onlyAuthorized() {
        require(authorizedUsers[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        authorizedUsers[msg.sender] = true;
    }

    function addHealthData(
        string memory _patientId,
        uint256 _heartRate,
        uint256 _spO2,
        uint256 _timestamp
    ) public onlyAuthorized {
        HealthRecord memory newRecord = HealthRecord({
            patientId: _patientId,
            heartRate: _heartRate,
            spO2: _spO2,
            timestamp: _timestamp
        });

        healthRecords[_patientId].push(newRecord);
        emit HealthDataAdded(_patientId, _heartRate, _spO2, _timestamp);
    }

    function getHealthData(string memory _patientId) public view returns (HealthRecord[] memory) {
        return healthRecords[_patientId];
    }

    function authorizeUser(address _user) public onlyAuthorized {
        authorizedUsers[_user] = true;
    }
}
