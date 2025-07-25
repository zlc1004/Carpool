import React from "react";

/** The Footer appears at the bottom of every page. Rendered by the App Layout component. */
class Footer extends React.Component {
  render() {
    const divStyle = { marginTop: "15px", paddingTop: "15px",
      paddingBottom: "15px", backgroundColor: "#024731", color: "white" };
    return (
        <footer style={divStyle}>
          <div className="ui center aligned container inverted">
            <hr />
              Carpool<br />
              SD45<br />
            Learn more at the <a href="https://carpool.github.io/">Carpool page</a>.
          </div>
        </footer>
    );
  }
}

export default Footer;
