pragma ton-solidity ^0.39.0;


interface IBasicEvent {
    enum Vote { Empty, Confirm, Reject }
    enum Status { Pending, Confirmed, Rejected }

    event Reject(uint relay);
    event Closed();
}
