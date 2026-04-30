"""NFE parser unit tests — no DB / HTTP required."""
import textwrap

import pytest

from app.services.nfe_parser import NFEParser


SAMPLE_XML = textwrap.dedent("""\
    <?xml version="1.0" encoding="UTF-8"?>
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe>
        <infNFe>
          <dest>
            <enderDest>
              <xLgr>Rua das Flores</xLgr>
              <nro>100</nro>
              <xBairro>Centro</xBairro>
              <xMun>São Paulo</xMun>
              <UF>SP</UF>
              <CEP>01001000</CEP>
            </enderDest>
          </dest>
        </infNFe>
      </NFe>
    </nfeProc>
""")


def test_parse_xml_string(tmp_path):
    xml_file = tmp_path / "sample.xml"
    xml_file.write_text(SAMPLE_XML, encoding="utf-8")
    addresses = NFEParser.parse_file(str(xml_file))
    assert isinstance(addresses, list)
    assert len(addresses) == 1
    addr_text = addresses[0]["address"]
    assert "São Paulo" in addr_text or "SP" in addr_text


def test_parse_unsupported_extension(tmp_path):
    f = tmp_path / "file.txt"
    f.write_text("hello")
    result = NFEParser.parse_file(str(f))
    assert result == []


def test_parse_malformed_xml(tmp_path):
    bad = tmp_path / "bad.xml"
    bad.write_text("<broken><not closed", encoding="utf-8")
    result = NFEParser.parse_file(str(bad))
    assert isinstance(result, list)
