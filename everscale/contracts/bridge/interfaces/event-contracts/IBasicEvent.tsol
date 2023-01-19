pragma ton-solidity >= 0.39.0;


interface IBasicEvent {
    enum Vote { Reserved, Empty, Confirm, Reject }
    enum Status { Initializing, Pending, Confirmed, Rejected }

    event Reject(uint relay);
    event Closed();
    event Confirmed();
    event Rejected(uint32 reason);
}
